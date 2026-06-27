const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { User, Subscription, Room, RoomMember } = require('../models');

// POST /api/payments/create-premium-checkout
const createPremiumCheckout = async (req, res) => {
  try {
    const user = req.user;

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'ChatSphere Premium', description: '10GB storage + unlimited history' },
          unit_amount: 999, // $9.99/month
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      success_url: `${process.env.CLIENT_URL}/settings?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/settings?payment=cancelled`,
      metadata: { userId: user.id, type: 'premium_personal' },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ success: false, message: 'Payment error' });
  }
};

// POST /api/payments/join-channel/:roomId
const joinPremiumChannel = async (req, res) => {
  try {
    const room = await Room.findByPk(req.params.roomId);
    if (!room || !room.isPremium)
      return res.status(404).json({ success: false, message: 'Premium channel not found' });

    const alreadyMember = await RoomMember.findOne({
      where: { roomId: room.id, userId: req.user.id },
    });
    if (alreadyMember)
      return res.json({ success: true, message: 'Already a member' });

    const user = req.user;
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Join: ${room.name}`, description: 'One-time channel access' },
          unit_amount: Math.round(parseFloat(room.premiumPrice) * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.CLIENT_URL}/chat/${room.id}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}?payment=cancelled`,
      metadata: { userId: user.id, roomId: room.id, type: 'channel_access' },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Channel payment error:', error);
    res.status(500).json({ success: false, message: 'Payment error' });
  }
};

// POST /api/payments/team-billing
const createTeamBilling = async (req, res) => {
  try {
    const { seats = 5 } = req.body;
    const pricePerSeat = 799; // $7.99 per seat

    const user = req.user;
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'ChatSphere Team', description: `${seats} seats — admin billing` },
          unit_amount: pricePerSeat,
          recurring: { interval: 'month' },
        },
        quantity: seats,
      }],
      success_url: `${process.env.CLIENT_URL}/settings?payment=success&plan=team`,
      cancel_url: `${process.env.CLIENT_URL}/settings?payment=cancelled`,
      metadata: { userId: user.id, type: 'team_billing', seats: String(seats) },
    });

    res.json({ success: true, url: session.url });
  } catch (error) {
    console.error('Team billing error:', error);
    res.status(500).json({ success: false, message: 'Payment error' });
  }
};

// POST /api/payments/webhook  — Stripe webhook
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, type, roomId, seats } = session.metadata;

      if (type === 'premium_personal') {
        await User.update({ isPremium: true, storageLimit: 10737418240 }, { where: { id: userId } });
        await Subscription.create({
          userId, type, stripeSubscriptionId: session.subscription,
          status: 'active', amount: 9.99,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
      }

      if (type === 'channel_access') {
        await RoomMember.findOrCreate({
          where: { roomId, userId },
          defaults: { roomId, userId, role: 'member' },
        });
        await Subscription.create({
          userId, type, roomId,
          stripePaymentIntentId: session.payment_intent,
          status: 'active', amount: parseFloat(session.amount_total) / 100,
        });
      }

      if (type === 'team_billing') {
        await Subscription.create({
          userId, type, stripeSubscriptionId: session.subscription,
          status: 'active', amount: (parseInt(seats) * 7.99),
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = await Subscription.findOne({
        where: { stripeSubscriptionId: event.data.object.id },
      });
      if (sub) {
        await sub.update({ status: 'cancelled' });
        await User.update({ isPremium: false, storageLimit: 104857600 }, { where: { id: sub.userId } });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// GET /api/payments/subscriptions
const getMySubscriptions = async (req, res) => {
  try {
    const subs = await Subscription.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, subscriptions: subs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createPremiumCheckout, joinPremiumChannel, createTeamBilling, handleWebhook, getMySubscriptions };

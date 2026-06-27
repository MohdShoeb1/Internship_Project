const User = require('./User');
const Room = require('./Room');
const RoomMember = require('./RoomMember');
const Message = require('./Message');
const Subscription = require('./Subscription');

// User <-> Room (many-to-many through RoomMember)
User.belongsToMany(Room, { through: RoomMember, foreignKey: 'userId', as: 'rooms' });
Room.belongsToMany(User, { through: RoomMember, foreignKey: 'roomId', as: 'members' });

// Room has many RoomMembers
Room.hasMany(RoomMember, { foreignKey: 'roomId', as: 'roomMembers' });
RoomMember.belongsTo(Room, { foreignKey: 'roomId' });

// User has many RoomMembers
User.hasMany(RoomMember, { foreignKey: 'userId' });
RoomMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Room has many Messages
Room.hasMany(Message, { foreignKey: 'roomId', as: 'messages' });
Message.belongsTo(Room, { foreignKey: 'roomId' });

// User has many Messages
User.hasMany(Message, { foreignKey: 'senderId', as: 'messages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Message reply-to self reference
Message.belongsTo(Message, { foreignKey: 'replyToId', as: 'replyTo' });

// User has many Subscriptions
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, Room, RoomMember, Message, Subscription };

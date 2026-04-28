// model associations - sets up all the relationships between tables
const User = require('./User');
const { Profile, Degree, Certification, Licence, Course, Employment } = require('./Profile');
const Bid = require('./Bid');
const FeaturedAlumni = require('./FeaturedAlumni');
const { ApiClient, ApiUsageLog } = require('./ApiClient');
const { Event, EventAttendee } = require('./Event');
const SponsorshipOffer = require('./SponsorshipOffer');

// user <-> profile (one to one)
User.hasOne(Profile, { foreignKey: 'user_id', as: 'profile', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// user <-> bids (one to many)
User.hasMany(Bid, { foreignKey: 'user_id', as: 'bids', onDelete: 'CASCADE' });
Bid.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// user <-> featured alumni (one to many)
User.hasMany(FeaturedAlumni, { foreignKey: 'user_id', as: 'featuredRecords', onDelete: 'CASCADE' });
FeaturedAlumni.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// bid <-> featured alumni (one to one)
Bid.hasOne(FeaturedAlumni, { foreignKey: 'bid_id', as: 'featuredRecord' });
FeaturedAlumni.belongsTo(Bid, { foreignKey: 'bid_id', as: 'bid' });

// user <-> api clients (one to many)
User.hasMany(ApiClient, { foreignKey: 'created_by', as: 'apiClients', onDelete: 'CASCADE' });
ApiClient.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// sponsorship offers
User.hasMany(SponsorshipOffer, { foreignKey: 'sponsor_id', as: 'sentOffers' });
User.hasMany(SponsorshipOffer, { foreignKey: 'alumnus_id', as: 'receivedOffers' });
SponsorshipOffer.belongsTo(User, { foreignKey: 'sponsor_id', as: 'sponsor' });
SponsorshipOffer.belongsTo(User, { foreignKey: 'alumnus_id', as: 'alumnus' });

module.exports = {
  User,
  Profile, Degree, Certification, Licence, Course, Employment,
  Bid,
  FeaturedAlumni,
  ApiClient, ApiUsageLog,
  Event, EventAttendee,
  SponsorshipOffer
};

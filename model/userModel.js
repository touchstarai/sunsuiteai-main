const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const chatsSchema = require('./chatsSchema');
const Plan = require('./planModel');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User must have a name'],
      minLength: [3, 'User name must have a minimum length of 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'User must have an email'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'User must have a password'],
      minLength: [8, 'User password length must be greater than or equal to 8.'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Users must confirm their password.'],
      validate: {
        validator: function (value) {
          return value === this.password;
        },
        message: 'passwordConfirm must be the same as password',
      },
    },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
    passwordChangedAt: Date,
    role: {
      type: String,
      enum: ['user', 'admin', 'dev'],
      default: 'user',
    },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: Date,
    emailVerified: { type: Boolean },
    subscription: { type: mongoose.Schema.ObjectId, ref: 'plan' },
    chats: [chatsSchema],
    subscriptionUpdatedAt: Date,
    conversationTokens: { type: Number, default: 0 },
    uploadTokens: { type: Number, default: 0 },
    signedUpWithGoogle: Boolean,
    createdAt: Date,
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
// Virtual populate

function generateRandomToken() {
  const randStr = crypto.randomBytes(20).toString('hex');

  const token = crypto.createHash('sha256').update(randStr).digest('hex');

  return [token, randStr];
}

// ---------------------- MIDDLWARES

// encryption of password and setting reset token and password confirm to undefined
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.passwordConfirm = undefined;
  this.resetToken = undefined;
  this.resetTokenExpiry = undefined;

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// set password changed at field
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now();
  next();
});

// Email verification and Created At
userSchema.pre('save', function (next) {
  if (this.isNew) {
    this.createdAt = Date.now();
    if (!this.signedUpWithGoogle) this.emailVerified = false;
  }

  next();
});

// Creating name
// Formate Name
userSchema.pre('save', function (next) {
  if (!this.isModified('name')) return next();

  let [firstName, lastName] = this.name.split(' ');

  firstName = firstName.slice(0, 1).toUpperCase() + firstName.slice(1);
  lastName = lastName ? lastName.slice(0, 1).toUpperCase() + lastName.slice(1) : '';

  this.name = `${firstName} ${lastName}`;

  next();
});

// new subscriptions
userSchema.pre('save', async function (next) {
  if (!this.isModified('subscription')) return next();

  const plan = await Plan.findById(this.subscription);

  // this.subscription = plan._id;
  this.subscriptionUpdatedAt = Date.now();
  this.conversationTokens = plan.conversationTokenLimit;
  this.uploadTokens = plan.uloadTokenLimit;

  next();
});

// SET Default plan
userSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  const filterObj = {
    name: this.role === 'user' ? 'free' : 'gold',
  };

  const plan = await Plan.findOne({ ...filterObj });

  // if (!plan) next();

  this.subscription = plan._id;
  this.subscriptionUpdatedAt = Date.now();
  this.conversationTokens = plan.conversationTokenLimit;
  this.uploadTokens = plan.uloadTokenLimit;

  next();
});

// SET NEGATIVE TOKEN LIMITS TO ZERO
// userSchema.pre('save', function (next) {
//   if (!this.isModified('tokenLimit')) return next();

//   if (this.tokenLimit < 500) this.tokenLimit = 0;

//   next();
// });

// for updating password
userSchema.pre(/AndUpdate$/, async function (next) {
  if (!this._update?.password) return next();

  this._update.password = await bcrypt.hash(this._update.password, 12);
  this.passwordChangedAt = Date.now();

  next();
});

userSchema.pre(/AndUpdate$/, async function (next) {
  if (!this._update.emailVerified) return next();

  this._update.emailVerified = undefined;
  this._update.emailVerificationExpiry = undefined;
  this._update.emailVerificationToken = undefined;

  next();
});

userSchema.pre(/^find/, function (next) {
  this.populate('subscription');
  // this.populate('chat');

  next();
});

userSchema.pre(/AndUpdate$/, async function (next) {
  if (!this._update?.plan) return next();

  const plan = await Plan.findOne({ name: this._update.plan.toLowerCase() });

  this._update.subscription = plan._id;
  this._update.subscriptionUpdatedAt = Date.now();
  this._update.conversationTokens = plan.conversationTokenLimit;
  this._update.uploadTokens = plan.uloadTokenLimit;

  next();
});

// userSchema.pre(/Update$/, async function (next) {
//   if (!this._update?.subscription) return next();

//   this._update.tokenLimit = (await Plan.findById(this._update.subscription)).tokenLimit;
//   this._update.subscriptionUpdatedAt = Date.now();

//   next();
// });

// --------------------------- METHODS
userSchema.methods.isCorrect = async function (candidatePass) {
  return await bcrypt.compare(candidatePass, this.password);
};

// Email Verification Token Generator
userSchema.methods.createEmailVerificationToken = function () {
  const [token, randStr] = generateRandomToken();

  this.emailVerificationToken = token;
  this.emailVerificationExpiry = new Date(
    Date.now() + process.env.EMAIL_VERIFICATION * 60 * 1000
  );

  return randStr;
};

userSchema.methods.createForgotToken = function () {
  const [token, randStr] = generateRandomToken();

  this.resetToken = token;
  this.resetTokenExpiry = new Date(Date.now() + process.env.RESET_EXPIRY * 60 * 1000);

  return randStr;
};

userSchema.methods.isPassChangedAfter = function (date) {
  if (!this.passwordChangedAt) return false;

  return this.passwordChangedAt / 1000 > date;
};

userSchema.methods.updateChatModifiedDate = async function (id) {
  this.chats.id(id).lastUpdatedAt = Date.now();

  await this.save({ validateBeforeSave: false });
};

userSchema.methods.updateUploadTokens = async function (tokens) {
  this.uploadTokens -= tokens;

  const updatedUser = await this.save({ validateBeforeSave: false, new: true });

  return updatedUser;
};

userSchema.methods.updateConversationTokens = async function (tokens) {
  this.conversationTokens -= tokens;

  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetUser = async function () {
  const plan = await Plan.findOne({ name: 'free' });

  this.subscription = plan._id;
  // this.subscriptionUpdatedAt = Date.now();
  // this.conversationTokens = plan.conversationTokenLimit;
  // this.uploadTokens = plan.uloadTokenLimit;

  const updatedUser = await this.save({ validateBeforeSave: false, new: true });

  return updatedUser;
};



const User = mongoose.model('User', userSchema);

module.exports = User;

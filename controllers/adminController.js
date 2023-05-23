const AppError = require('../util/AppError');
const catchAsync = require('../util/catchAsync');

const User = require('../model/userModel');
const Plan = require('../model/planModel');

exports.users = catchAsync(async function (req, res, next) {
  const limit = 9;
  const numOfPages = (await User.count()) / limit;
  const page = +req.query.page > Math.ceil(numOfPages) ? 1 : req.query.page || 1;

  const skip = (Math.abs(+page) - 1) * limit;

  const users = await User.find()
    .sort('-createdAt')
    .select('+emailVerified')
    .skip(skip)
    .limit(limit);
  const plans = await Plan.find();

  res.render('adminUsers', { title: 'Manage Users', users, numOfPages, page, plans });
});

exports.adminDashboard = catchAsync(async function (req, res, next) {
  // Features Enabled
  // emails sent

  const userStats = await User.aggregate([
    {
      $lookup: {
        from: 'plans',
        foreignField: '_id',
        localField: 'subscription',
        as: 'subscription',
      },
    },
    {
      $unwind: { path: '$subscription' },
    },
    {
      $group: {
        _id: '$subscription.name',
        numOfusers: { $sum: 1 },
        emails: { $push: '$email' },
      },
    },
  ]);

  const { enabledSubs } = (
    await Plan.aggregate([
      {
        $group: {
          _id: 'stats',
          enabledSubs: {
            $sum: { $cond: { if: { $ne: ['$enabled', false] }, then: 1, else: 0 } },
          },
        },
      },
    ])
  )[0];

  //  Total Usrs
  const totalUsers = userStats.reduce((acc, stat) => acc + stat.numOfusers, 0);

  // upgraded users
  const upgradedUsers = userStats.reduce((acc, stat) => {
    return stat._id === 'free' ? acc : acc + stat.numOfusers;
  }, 0);

  const viewVars = {
    totalUsers,
    upgradedUsers,
    enabledSubs,

    title: 'Admin Dashboard',
  };

  res.render('adminDashboard', viewVars);
});

exports.managePlans = catchAsync(async function (req, res, next) {
  const plans = await Plan.find().select('+enabled');

  res.render('adminPlans', { title: 'Manage Plans', plans });
});

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/../config.env` });

const fs = require('fs');
const Plan = require('../model/planModel');

const db = process.env.DB.replace('<password>', process.env.DB_PASSWORD);

(async () => {
  await mongoose.connect(db);

  console.log('successful connection');

  if (process.argv[2] === '--import') {
    const plans = JSON.parse(fs.readFileSync(`${__dirname}/pricing.json`));

    const docs = await Plan.create(plans);

    console.log('Successfuly loaded');
  }

  if (process.argv[2] === '--delete') {
    await Plan.find().deleteMany();

    console.log('Plans are deleted');
  }

  console.log('Action Successful');
})();

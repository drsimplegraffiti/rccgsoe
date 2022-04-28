require('dotenv').config();
const connectDB = require('./config/database');
const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const QR = require('qrcode');
const User = require('./model/user');
const ConnectedDevice = require('./model/connectedDevice');
const QRCode = require('./model/qrCode');
const sendEmail = require('./utils/mail');
const { mailTemp } = require('./utils/mailTemp');
const ClockIn = require('./model/clockIn');
const { isAuthUser } = require('./middleware/auth');
const helmet = require('helmet');

connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan('dev'));

// Logic here

app.get('/', async (req, res) => {
  try {
    const response = await QR.toDataURL('http://rccgsoe.com');
    const response1 = await fs.writeFileSync(
      './qr.html',
      `<img src="${response}">`
    );
    console.log('Wrote to ./qr.html');
    return res.status(200).json({ resp1: response1, resp: response });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});

app.post('/register', async (req, res) => {
  try {
    // Get user input
    const { name, email, password, gender, phone_number, DOB } = req.body;

    // Validate user input
    if (!(email && password && name && gender && DOB && phone_number)) {
      return res.status(400).send('All input is required');
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send('User Already Exist. Please Login');
    }
    const salt = await bcrypt.genSalt(10);
    // Encrypt user password
    encryptedPassword = await bcrypt.hash(password, salt);

    // Create user in our database
    const user = await User.create({
      name,
      DOB,
      email,
      password: encryptedPassword,
      phone_number,
      gender,
    });
    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: '2h',
      }
    );
    //send mail notification
    await sendEmail({
      email: user.email,
      subject: 'Welcome to RCCG SOE',
      message: await mailTemp(name),
    });
    // return new user
    return res.status(201).json({ token: token, userId: user._id });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});

app.post('/login', async (req, res) => {
  // Our login logic starts here
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send('All input is required');
    }

    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: '2h',
        }
      );

      // user
      return res.status(200).json({ token: token, userId: user._id });
    }
    return res.status(400).send('Invalid Credentials');
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});

app.post('/qr/generate', async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate user input
    if (!userId) {
      return res.status(400).send('User Id is required');
    }

    const user = await User.findById(userId);

    // Validate is user exist
    if (!user) {
      return res.status(400).send('User not found');
    }

    const qrExist = await QRCode.findOne({ userId });

    // If qr exist, update disable to true and then create a new qr record
    if (!qrExist) {
      await QRCode.create({ userId });
    } else {
      await QRCode.findOneAndUpdate({ userId }, { $set: { disabled: true } });
      await QRCode.create({ userId });
    }

    // Generate encrypted data
    const encryptedData = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      process.env.TOKEN_KEY,
      {
        expiresIn: '1d',
      }
    );

    const opts = {
      errorCorrectionLevel: 'H',
      type: 'terminal',
      quality: 0.95,
      margin: 1,
      color: {
        dark: '#208698',
        light: '#FFF',
      },
      width: 1,
      height: 1,
    };

    // Generate qr code
    const dataImage = await QR.toDataURL(encryptedData);
    const dataImageToTerminal = await QR.toString(encryptedData);
    console.log(dataImageToTerminal);
    console.log(dataImage);
    const dataInfo = {
      userId: user._id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      dataImage: dataImage,
    };
    // Return qr code
    return res.status(200).json(dataInfo);
  } catch (err) {
    console.log(err);
  }
});

app.post('/qr/scan', async (req, res) => {
  try {
    const { token, deviceInformation } = req.body;

    if (!token && !deviceInformation) {
      res.status(400).send('Token and deviceInformation is required');
    }

    const decoded = jwt.verify(token, process.env.TOKEN_KEY);

    const qrCode = await QRCode.findOne({
      userId: decoded.userId,
      disabled: false,
    });

    if (!qrCode) {
      res.status(400).send('QR Code not found');
    }

    const connectedDeviceData = {
      userId: decoded.userId,
      qrCodeId: qrCode._id,
      deviceName: deviceInformation.deviceName,
      deviceModel: deviceInformation.deviceModel,
      deviceOS: deviceInformation.deviceOS,
      deviceVersion: deviceInformation.deviceVersion,
    };

    const connectedDevice = await ConnectedDevice.create(connectedDeviceData);

    // Update qr code
    await QRCode.findOneAndUpdate(
      { _id: qrCode._id },
      {
        isActive: true,
        connectedDeviceId: connectedDevice._id,
        lastUsedDate: new Date(),
      }
    );

    // Find user
    const user = await User.findById(decoded.userId);

    // Create token
    const authToken = jwt.sign({ user_id: user._id }, process.env.TOKEN_KEY, {
      expiresIn: '2h',
    });

    // Return token
    return res.status(200).json({ token: authToken });
  } catch (err) {
    console.log(err);
  }
});

app.post('/clockin', isAuthUser, async (req, res) => {
  try {
    const { clockIn } = req.body;
    const id = req.user.id;
    const checkUser = await User.findOne(id);
    if (!checkUser) {
      return res.status(400).send('User not found');
    }
    const clockInUser = await ClockIn.create({
      userId: checkUser._id,
      clockIn: new Date(),
    });
    return res.status(200).json({ clockInUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});

app.get('/user/profile', isAuthUser, async (req, res) => {
  try {
    const id = req.user.id;
    const checkUser = await User.findOne(id);
    if (!checkUser) {
      return res.status(400).send('User not found');
    }
    return res.status(200).json({ checkUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});

app.get('/recent/attendance', isAuthUser, async (req, res) => {
  try {
    const id = req.user.id;
    const checkUser = await User.findOne(id);
    if (!checkUser) {
      return res.status(400).send('User not found');
    }
    const recentAttendance = await ClockIn.find({ userId: checkUser._id }).sort(
      { createdAt: -1 }
    );
    return res.status(200).json({ recentAttendance });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 'failed',
      message: 'Internal Server Error',
    });
  }
});
module.exports = app;

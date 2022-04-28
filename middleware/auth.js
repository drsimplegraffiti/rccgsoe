const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();
const { TOKEN_KEY } = process.env;

exports.isAuthUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json('Token Is missing');

    const decoded = await jwt.verify(token, TOKEN_KEY);
    if (!decoded) {
      throw new Error();
    }
    req.user = decoded;
    console.log('===req.user');
    console.log(req.user);
    console.log('===req.user');

    next();
  } catch (e) {
    return res.status(401).json('signUp as user || Token expired ');
  }
};

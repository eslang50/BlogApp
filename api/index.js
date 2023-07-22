const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./models/User')
const Post = require('./models/Post')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {mongoPassword, jwtSecret} = require('./secrets');
const cookieParser = require('cookie-parser');
const multer = require('multer')
const uploadMiddleware = multer({dest: 'uploads/'})
const fs = require('fs')
const app = express();

const salt = bcrypt.genSaltSync(10)

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());

mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);

app.post('/register', async (request, response) => {
  const {username, password} = request.body;
  try {
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt)})
    response.json(userDoc)
  } catch(error) {
    response.status(400).json(error)
  }
});

app.post('/login', async (request, response) => {
  const {username, password} = request.body;
  const userDoc = await User.findOne({username})
  const correctPass = bcrypt.compareSync(password, userDoc.password)
  if(correctPass) {
    jwt.sign({username,id:userDoc._id}, jwtSecret, {}, (err, token) => {
      if(err) throw err;
      response.cookie('token', token).json({
        id:userDoc._id,
        username
      })
    })
  } else {
    response.status(400).json('Incorrect password or username')
  }
});

app.get('/profile', (request, response) => {
  const {token} = request.cookies;
  jwt.verify(token, jwtSecret, {}, (err,info) => {
    if(err) throw err;
    response.json(info);
  })
})

app.post('/logout', (request, response) => {
  response.cookie('token', '').json('ok')
})

app.post('/post', uploadMiddleware.single('file'), async (request, response) => {
  const {originalname, path} = request.file;
  const parts = originalname.split('.');
  const extension = parts[parts.length - 1]
  const newPath = `${path}.${extension}`;
  fs.renameSync(path, newPath)
  const {title,summary,content} = request.body;
  const postDoc = await Post.create({
    title,
    summary,
    content,
    cover: newPath,
  })
  response.json(postDoc);
})

app.listen(4000)
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
app.use('/uploads', express.static(__dirname + '/uploads'));

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

  const {token} = request.cookies;
  jwt.verify(token, jwtSecret, {}, async (err,info) => {
    if(err) throw err;
    const {title,summary,content} = request.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    response.json(postDoc);
  });
});

app.put('/post', uploadMiddleware.single('file'), async (request, response) => {
  let newPath = null;
  if(request.file) {
    const {originalname, path} = request.file;
    const parts = originalname.split('.');
    const extension = parts[parts.length - 1];
    newPath = `${path}.${extension}`
    fs.renameSync(path, newPath);
  }
  const {token} = request.cookies;
  
  jwt.verify(token, jwtSecret, {}, async (err,info) => {
    if(err) throw err; 
    const {id,title,summary,content} = request.body;
    const postDoc = await Post.findById(id)
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if(!isAuthor) {
      return response.status(400).json('You are not the author')
    }
    await postDoc.updateOne(
      {title,
       summary,
       content, 
       cover: newPath ? newPath : postDoc.cover
      });
    response.json(postDoc);
  });
})

app.get('/post', async (request,response) => {
  response.json(await Post.find()
  .populate('author', ['username'])
  .sort({createdAt: -1})
  .limit(20)
  )
})

app.get('/post/:id', async(request, response) => {
  const {id} = request.params
  const postDoc = await Post.findById(id).populate('author', ['username']);
  response.json(postDoc);
})


app.listen(4000)
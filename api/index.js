const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const User = require('./models/User')
const Post = require('./models/Post')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {mongoPassword, jwtSecret, S3_ACCESS_KEY, S3_SECRET_ACCESS_KEY} = require('./secrets');
const cookieParser = require('cookie-parser');
const bucket = 'ethan-blog-app'
const multer = require('multer');
const uploadMiddleware = multer({dest:'/tmp'});
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const fs = require('fs')
const app = express();

const salt = bcrypt.genSaltSync(10)

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(cors({
  origin: ["https://ethan-blog-app.vercel.app"],
  methods: ["POST", "GET"],
  credentials: true
}))
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


async function uploadToS3(path, originalFileName, mimetype) {
  const client = new S3Client({
    region: 'us-east-1',
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_ACCESS_KEY
    }
  })
  const parts = originalFileName.split('.')
  const extension = parts[parts.length - 1];
  const newFileName = Date.now() + '.' + extension;
  const data = await client.send(new PutObjectCommand({
    Bucket: bucket,
    Body: fs.readFileSync(path),
    Key: newFileName,
    ContentType: mimetype,
    ACL: 'public-read'
  }));
  return `https://${bucket}.s3.amazonaws.com/${newFileName}`;
}

app.post('/register', async (request, response) => {
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  console.log(request.body)
  const {username, password} = request.body;
  try {
    const userDoc = await User.create({
      username,
      password:bcrypt.hashSync(password,salt)})
    response.json(userDoc)
  } catch(error) {
    console.log(userDoc)
    response.status(400).json(error)
  }
});

app.post('/login', async (request, response) => {
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
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
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  const {token} = request.cookies;
  jwt.verify(token, jwtSecret, {}, (err,info) => {
    console.log('Token:', token);
    if(err) throw err;
    response.json(info);
  })
})

app.post('/logout', (request, response) => {
  response.cookie('token', '').json('ok')
})

app.post('/post', uploadMiddleware.single('file'), async (request, response) => {
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  console.log(request)
  const {path, originalname, mimetype} = request.file;
  const url = await uploadToS3(path, originalname, mimetype);

  const {token} = request.cookies;
  jwt.verify(token, jwtSecret, {}, async (err,info) => {
    if(err) throw err;
    const {title,summary,content} = request.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: url,
      author: info.id,
    });
    response.json(postDoc);
  });
});

app.put('/post', uploadMiddleware.single('file'), async (request, response) => {  
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  const {originalname, path, mimetype} = request.file;
  const url = await uploadToS3(path, originalname, mimetype);
  
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
       cover: url ? url : postDoc.cover
      });
    response.json(postDoc);
  });
})

app.get('/post', async (request,response) => {
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  response.json(await Post.find()
  .populate('author', ['username'])
  .sort({createdAt: -1})
  .limit(20)
  )
})

app.get('/post/:id', async(request, response) => {
  mongoose.connect(`mongodb+srv://eslangliu:${mongoPassword}@cluster0.ojfjibw.mongodb.net/?retryWrites=true&w=majority`);
  const {id} = request.params
  const postDoc = await Post.findById(id).populate('author', 'username');
  response.json(postDoc);
})

const port = process.env.PORT || 4000;
app.listen(port)
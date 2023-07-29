import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill";

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
  
    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction
  
    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],
  
    ['clean']  
  ]
}

export default function EditPost() {
  const {id} = useParams()
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState('');
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4000/post/'+id)
    .then(response => {
      response.json().then(postInfo => {
        setTitle(postInfo.title);
        setContent(postInfo.content);
        setSummary(postInfo.summary);
      })
    })
  }, []);

  async function updatePost(e) {
    e.preventDefault()
    const data = new FormData()
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    data.set('id', id)
    if(files?.[0]) {
      data.set('file', files?.[0]);
    }
    try {
      const response = await fetch(`http://localhost:4000/post`, {
        method: 'PUT',
        body: data,
        credentials: 'include',
      });
  
      if (response.ok) {
        setRedirect(true);
      } else {
        // Handle non-OK response (e.g., display an error message)
        console.error('Update request failed:', response);
      }
    } catch (error) {
      // Handle fetch error
      console.error('Fetch error:', error);
    }
    const response = await fetch('http://localhost:4000/post', {
      method: 'PUT',
      body: data,
      credentials: 'include',
    })
    if(response.ok) {
      setRedirect(true)
    }
  }
  
  if(redirect) {
    return <Navigate to={`/post/${id}`} />
  }
  return (
    <form action="" onSubmit={updatePost}>
      <input type="title" placeholder={'Title'} value={title} onChange={e => setTitle(e.target.value)} />
      <input type="summary" placeholder={'Summary'} value={summary} onChange={e => setSummary(e.target.value)} />
      <input type="file" onChange={e => setFiles(e.target.files)} />
      <ReactQuill value={content} modules={modules} onChange={newValue => setContent(newValue)} />
      <button style={{marginTop: '5px'}}>Update Post</button>
    </form>
  )
}
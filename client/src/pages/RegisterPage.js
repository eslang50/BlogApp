import { useState } from "react"

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  async function register(e) {
    e.preventDefault();
      const response = await fetch('http://localhost:4000/register', {
        method: 'POST',
        body: JSON.stringify({username, password}),
        headers: {'Content-Type': 'applic ation/json'}
      })
      if(response.status === 200) {
        alert('Success')
      }
      else {
        alert('Failed')
      }
  }
  return (
  <form action="" className="register" onSubmit={register}>
    <h1>Register</h1>
    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}/>
    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}/>
    <button>Register</button>
  </form>
  )
}
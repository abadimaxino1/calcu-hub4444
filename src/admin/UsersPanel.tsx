import React, { useEffect, useState } from 'react';

export default function UsersPanel(){
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fetch('/api/admin/users', { credentials: 'include' }).then(r=>r.json()).then(j=>{ if (j && j.ok) setUsers(j.users || []); setLoading(false); }).catch(()=>setLoading(false));
  },[]);
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Users</h3>
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr><th>Username</th><th>Roles</th><th>Created</th></tr>
        </thead>
        <tbody>
          {users.map(u=> (
            <tr key={u.username}><td>{u.username}</td><td>{(u.roles||[]).join(', ')}</td><td>{new Date(u.createdAt).toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

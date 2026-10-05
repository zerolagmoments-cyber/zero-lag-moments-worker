export default async()=>new Response(JSON.stringify({ok:true,message:'Netlify Functions are online.'}),{headers:{'Content-Type':'application/json'}});

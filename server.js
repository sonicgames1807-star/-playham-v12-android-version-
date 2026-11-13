import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
const app=express(), server=createServer(app), io=new Server(server,{cors:{origin:'*'}});
app.use(express.static('dist'));
const players=new Map(), pieces=new Map();
io.on('connection',socket=>{
  socket.emit('snapshot',{players:[...players.values()],pieces:[...pieces.values()]});
  socket.on('join',name=>{const p={id:socket.id,name:String(name).slice(0,18),x:0,y:0,z:0,yaw:0,hp:100};players.set(socket.id,p);io.emit('player',p)});
  socket.on('move',p=>{const old=players.get(socket.id);if(!old)return;Object.assign(old,{x:+p.x||0,y:+p.y||0,z:+p.z||0,yaw:+p.yaw||0});socket.broadcast.emit('player',old)});
  socket.on('piece',p=>{if(!p||!['wall','floor','ramp','roof'].includes(p.type)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||!Number.isInteger(p.z)||Math.abs(p.x)>100||Math.abs(p.z)>100||p.y<0||p.y>30)return;const id=`${p.x},${p.y},${p.z},${p.type},${p.rot%4}`;if(pieces.has(id))return;const piece={...p,id,owner:socket.id,mask:Array(p.type==='wall'?9:4).fill(true),hp:200};pieces.set(id,piece);io.emit('piece',piece)});
  socket.on('edit',e=>{const p=pieces.get(e?.id);if(!p||!Array.isArray(e.mask)||e.mask.length!==p.mask.length||!e.mask.some(Boolean))return;p.mask=e.mask.map(Boolean);p.hp=Math.min(200,+e.hp||p.hp);io.emit('edit',{id:p.id,mask:p.mask,hp:p.hp})});
  socket.on('damage',e=>{const p=pieces.get(e?.id);if(!p)return;const amount=Math.max(1,Math.min(200,Number(e.amount)||30));p.hp=Math.max(0,p.hp-amount);if(p.hp===0){pieces.delete(p.id);io.emit('remove',p.id)}else io.emit('damage',{id:p.id,hp:p.hp})});
  socket.on('clear',()=>{for(const [id,p] of pieces)if(p.owner===socket.id){pieces.delete(id);io.emit('remove',id)}});
  socket.on('disconnect',()=>{players.delete(socket.id);io.emit('leave',socket.id)});
});
server.listen(process.env.PORT||3001,()=>console.log('Riftforge Arena server: http://localhost:3001'));

const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const jar = {};
function req(opts, body) { return new Promise((resolve, reject) => { const r = http.request({ host: '127.0.0.1', port: 3000, ...opts, headers: { 'Origin': 'http://localhost:5173', ...(opts.headers||{}) } }, res => { const c=[]; res.on('data', d=>c.push(d)); res.on('end', () => { const buf=Buffer.concat(c); resolve({ status: res.statusCode, headers: res.headers, body: buf, json: (() => { try { return buf.length?JSON.parse(buf.toString()):null; } catch { return null; } })() }); }); }); r.on('error', reject); if (body) r.write(body); r.end(); }); }
function capture(r) { const sc=r.headers['set-cookie']||[]; for (const c of sc) { const [p]=c.split(';'); const[k,v]=p.split('='); jar[k]=v; } }
const cookies = () => Object.entries(jar).map(([k,v])=>k+'='+v).join('; ');
function makePng(w, h) { const sig=Buffer.from([137,80,78,71,13,10,26,10]); const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0; function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const ty=Buffer.from(t);let c,t2=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t2[n]=c;}c=-1;const b=Buffer.concat([ty,d]);for(let i=0;i<b.length;i++)c=t2[(c^b[i])&0xff]^(c>>>8);const crc=Buffer.alloc(4);crc.writeInt32BE((c^-1)|0,0);return Buffer.concat([l,ty,d,crc]);} const rows=[]; for(let y=0;y<h;y++){const r=Buffer.alloc(1+w*3);r[0]=0;for(let x=0;x<w;x++){r[1+x*3]=200;r[2+x*3]=200;r[3+x*3]=200;}rows.push(r);} return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]); }
function upload(path, body) { return new Promise((resolve, reject) => { const boundary='----b'+Date.now(); const parts=[Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n`), body, Buffer.from(`\r\n--${boundary}--\r\n`)]; const full=Buffer.concat(parts); const r=http.request({host:'127.0.0.1',port:3000,method:'POST',path,headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`,'Content-Length':full.length,Cookie:cookies()}},res=>{const c=[];res.on('data',d=>c.push(d));res.on('end',()=>{try{resolve({status:res.statusCode,json:JSON.parse(Buffer.concat(c).toString())});}catch(e){resolve({status:res.statusCode,body:Buffer.concat(c).toString()});}});});r.on('error',reject);r.write(full);r.end();}); }

(async () => {
  const r1 = await req({ method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json' } }, JSON.stringify({ username: 'admin', password: 'admin123' }));
  capture(r1);
  const c = await req({ method: 'POST', path: '/api/clients', headers: { 'Content-Type': 'application/json', Cookie: cookies() } }, JSON.stringify({ name: 'Verify-' + Date.now(), location: 'Test', contactName: 'Cliente', contactEmail: 'c@t.com', frequencyDays: 30 }));
  const cid = c.json.client.id;
  const e = await req({ method: 'POST', path: '/api/clients/' + cid + '/equipment', headers: { 'Content-Type': 'application/json', Cookie: cookies() } }, JSON.stringify({ name: 'PC-Test' }));
  const eid = e.json.equipment.id;
  const m = await req({ method: 'POST', path: '/api/maintenances', headers: { 'Content-Type': 'application/json', Cookie: cookies() } }, JSON.stringify({ clientId: cid, equipmentIds: [eid] }));
  const mid = m.json.maintenance.id;
  const miid = m.json.maintenance.items[0].id;
  await upload('/api/maintenances/' + mid + '/items/' + miid + '/attachments', makePng(50, 50));
  const at = (await req({ method: 'GET', path: '/api/action-types', headers: { Cookie: cookies() } })).json.actionTypes[0];
  await req({ method: 'PATCH', path: '/api/maintenances/' + mid + '/items/' + miid, headers: { 'Content-Type': 'application/json', Cookie: cookies() } }, JSON.stringify({ actionTypeId: at.id, observations: 'OK', completed: true }));

  const sigClient = 'data:image/png;base64,' + makePng(300, 100).toString('base64');
  const sigTech = 'data:image/png;base64,' + makePng(280, 90).toString('base64');
  const close = await req({ method: 'POST', path: '/api/maintenances/' + mid + '/close', headers: { 'Content-Type': 'application/json', Cookie: cookies() } }, JSON.stringify({ clientSignatureData: sigClient, technicianSignatureData: sigTech }));
  console.log('close status:', close.status, 'pdfPath:', close.json?.maintenance?.pdfPath, 'pdfEngine:', close.json?.maintenance?.pdfEngine);

  const pdf = await req({ method: 'GET', path: '/api/maintenances/' + mid + '/pdf', headers: { Cookie: cookies() } });
  console.log('PDF:', pdf.status, '| size:', pdf.body.length, '| starts with %PDF:', pdf.body.slice(0, 4).toString() === '%PDF');
  fs.writeFileSync('C:/Users/User/Desktop/Peguita/Codigos wao/APP manten/apps/api/test-output.pdf', pdf.body);

  // Decompress all streams and search for terms
  const s = pdf.body.toString('latin1');
  const streamRe = /stream\s*([\s\S]*?)\s*endstream/g;
  let match;
  let allText = '';
  while ((match = streamRe.exec(s)) !== null) {
    try {
      const data = Buffer.from(match[1].replace(/[\r\n]/g, ''), 'latin1');
      allText += zlib.inflateSync(data).toString('latin1') + '\n';
    } catch (e) {}
  }
  console.log('PDF text content (decompressed):');
  for (const term of ['Mantenti', 'Reporte', 'Firma del T', 'Firma del C', 'Fecha de esta', 'Pr', 'xima', 'Test', 'PC-Test', 'Banco', 'Santiago']) {
    console.log('  contains "' + term + '":', allText.includes(term));
  }
  console.log('Embedded images:', (s.match(/\/Subtype\s*\/Image/g) || []).length);

  await req({ method: 'DELETE', path: '/api/clients/' + cid, headers: { Cookie: cookies() } });
  console.log('cleanup done');
})().catch(e => { console.error('CRASH:', e); process.exit(1); });

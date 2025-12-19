const fs = require('fs');
const s = fs.readFileSync('assets/main.js','utf8');
let par=0, curl=0, sq=0, bt=0;
for(let i=0;i<s.length;i++){
  const c = s[i];
  if(c==='(') par++; if(c===')') par--;
  if(c==='{') curl++; if(c==='}') curl--;
  if(c==='`') bt++;
  if(par<0 || curl<0){
    const line = s.substring(0,i).split('\n').length;
    console.log('negative at idx',i,'char',c,'line',line,'par',par,'curl',curl);
    process.exit(0);
  }
}
console.log('final par',par,'curl',curl,'backticks',bt,'lines',s.split('\n').length);

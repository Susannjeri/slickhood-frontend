import {readdirSync,statSync} from "node:fs";
import {join} from "node:path";

const directory=join(process.cwd(),"public","insurance","brands");
const files=readdirSync(directory).filter(name=>!name.startsWith("."));
const unexpected=files.filter(name=>!name.endsWith(".webp"));
const sizes=files.map(name=>({name,bytes:statSync(join(directory,name)).size}));
const total=sizes.reduce((sum,item)=>sum+item.bytes,0);
const oversized=sizes.filter(item=>item.bytes>30*1024);

console.log(`Insurance brands: ${files.length} files, ${total} bytes / 102400-byte budget`);
if(files.length<6||unexpected.length||oversized.length||total>100*1024){
  console.error(JSON.stringify({unexpected,oversized,total}));
  process.exit(1);
}

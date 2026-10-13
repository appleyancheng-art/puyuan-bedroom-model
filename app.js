import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import {buildEnvironment} from './environment.js?v=b1400';

const $=id=>document.getElementById(id);
const viewport=$('viewport'), stage=document.querySelector('.stage');
const query=new URLSearchParams(location.search);
const state={plan:'B',view:['iso','top','entry','window'].includes(query.get('view'))?query.get('view'):'iso',explode:Math.min(100,Math.max(0,Number(query.get('explode'))||0))/100,doors:false,cut:false,walls:'low',dimensions:true,person:false,ceiling:'outline',curtain:85,sheer:true,theme:query.get('theme')==='walnut'?'walnut':'oak'};
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}
catch(e){$('loading').innerHTML='<p>当前浏览器未能启用 3D 图形加速。</p><p>请用新版 Safari、Chrome 或 Edge 打开此链接。</p>';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
renderer.localClippingEnabled=true;viewport.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label','可旋转的卧室三维模型');renderer.domElement.setAttribute('role','img');
const scene=new THREE.Scene();
const perspective=new THREE.PerspectiveCamera(37,1,.05,80);const orthographic=new THREE.OrthographicCamera(-4,4,4,-4,.05,80);let camera=perspective;
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=2;controls.maxDistance=23;controls.maxPolarAngle=Math.PI*.49;
controls.target.set(0,.4,0);controls.screenSpacePanning=true;
const hemi=new THREE.HemisphereLight(0xffffff,0xb6b6ac,2.3);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1.8);sun.position.set(-3,9,-5);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.028;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight(0xe6edf8,1.2);fill.position.set(5,4,5);scene.add(fill);
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.13}));shadowPlane.rotation.x=-Math.PI/2;shadowPlane.position.y=-.19;shadowPlane.receiveShadow=true;scene.add(shadowPlane);
const clipping=new THREE.Plane(new THREE.Vector3(0,-1,0),1.2);
const materialList=[];
function mat(color,roughness=.8,extras={}){const m=new THREE.MeshStandardMaterial({color,roughness,...extras});materialList.push(m);return m;}
function woodTexture(){const c=document.createElement('canvas');c.width=512;c.height=1024;const x=c.getContext('2d');x.fillStyle='#cbb48f';x.fillRect(0,0,512,1024);let seed=1921;const rnd=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};for(let p=0;p<16;p++){const a=p*32;x.fillStyle=p%2?'#cdb895':'#d2bd9b';x.fillRect(a,0,32,1024);for(let i=0;i<45;i++){const px=a+rnd()*32;x.strokeStyle=`rgba(104,75,38,${rnd()*.12})`;x.lineWidth=.3+rnd()*.6;x.beginPath();x.moveTo(px,0);x.bezierCurveTo(px+3,300,px-2,600,px,1024);x.stroke();}x.fillStyle='#a18d702b';x.fillRect(a,0,1,1024);for(let j=0;j<3;j++){const h=(p%3)*120+j*380;x.fillRect(a,h,32,1);}}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
const wood=woodTexture();
const M={floor:mat('#ffffff',.86,{map:wood}),oak:mat('#c2a67f'),cabinet:mat('#bec7b5'),inside:mat('#e8e2d3'),ivory:mat('#f1eee4'),wall:mat('#e5e6de'),plinth:mat('#bbbda9'),brass:mat('#b29461',.35,{metalness:.55}),cloth:mat('#ece9db'),linen:mat('#d4d8c7'),pillow:mat('#fbf9ee'),glass:mat('#bcd0c9',.2,{transparent:true,opacity:.28,metalness:.08,side:THREE.DoubleSide}),mirror:mat('#aebbb1',.22,{metalness:.65,emissive:0x334c41,emissiveIntensity:.18}),skin:mat('#ba9274'),person:mat('#637762',.8,{transparent:true,opacity:.55}),rail:mat('#7d8076',.3,{metalness:.7}),background:mat('#d3c4a9'),pot:mat('#ccbaa2')};
let model=new THREE.Group(),dimensions=new THREE.Group(),personGroup=new THREE.Group(),lowWalls,fullWalls;
scene.add(model,dimensions,personGroup);
let parts=[],doorParts=[],drawerParts=[],labels=[],pickables=[],highlight=null,selection=null,cameraMove=null,explodeValue=state.explode,doorValue=0,autoPlay=false,lastTime=0,environment=null;
const info={
 main:{title:'01 · 主衣柜',desc:'柜门朝向衣帽区，950 长衣＋950 短衣＋1000 叠衣模块。常用衣物放左侧，右端低频收纳与梳妆错时使用。1400 为柜门关闭时的主过道净深。',dims:()=> '宽 2900 × 深 600 × 高 2400 mm'},
 back:{title:'02 · 柜背 / 床头背景',desc:'床头贴柜背，50 mm 为背衬与饰面构造预留。固定方式及隔声节点需现场深化。',dims:()=> '宽 2900 × 厚 50 × 高 2400 mm'},
 secondary:{title:'03 · 次净衣柜',desc:'紧邻入口，开放浅柜用正面挂钩存放次净衣。上层放包，底部放可取出的洗衣篮。',dims:()=> '宽 700 × 深 450 × 高 2100 mm'},
 storage:{title:'04 · 抽屉收纳柜',desc:'三层抽屉放内衣、配饰和叠衣。打开约 250 mm 后，主通道局部约剩 1150 mm。',dims:()=> '宽 900 × 深 450 × 高 850 mm'},
 vanity:{title:'05 · L 形转角化妆桌',desc:'端墙主台 1300×450，右墙延伸 650×450，外包尺寸 1300×1100。膝部净宽约 825；右端台与主柜间净距 750，使用时避开右端柜门。',dims:()=> '外包 1300 × 1100 · 两边台深 450 · 高 750 mm'},
 vanity_storage:{title:'06 · 化妆桌下收纳柜',desc:'藏在右侧延伸台下，把抽屉留给化妆品和吹风机，正面坐姿膝部空间保持空置。',dims:()=> '宽 450 × 深 500 × 高 720 mm'},
 mirror:{title:'07 · 梳妆镜',desc:'位于端墙主台上方，镜底离地 900。镜面为材质示意，不是实时反射。',dims:()=> '宽 900 × 高 800 × 厚 20 mm'},
 stool:{title:'08 · 化妆凳',desc:'凳子置于主台中央，使用后推入台下；人物显示仅用于判断坐姿占位。',dims:()=> '直径 480 × 高 450 mm'},
 bed:{title:'09 · 1.8 米床',desc:'床头靠柜背，床尾朝窗。床架到窗墙 900，扣除 150 窗帘预留，床尾净距 750。左右床侧各 950（柜端主入口净宽 900）。',dims:()=> '床架 1900 × 2100 × 高 300；床垫 1800 × 2000 × 厚 230 mm'},
 shell:{title:'房间与原入口',desc:'保留原左侧入口、外窗与柱位关系。墙窗立面为概念示意。',dims:()=> '宽 3800 × 长 5500 · 原侧向入口约 875 mm'},
 floor:{title:'房间地面',desc:'450 端墙家具＋1400 主过道＋600 主柜＋50 柜背＝2500 衣帽区。余下 3000 为睡眠区。',dims:()=> '面积 20.9 ㎡ · 衣帽区进深 2500 mm'},
};
function group(parent,key){const g=new THREE.Group();g.userData.key=key;parent.add(g);return g;}
function component(parent,key,pos=[0,0,0],offset=[0,0,0]){const g=group(parent,key);g.position.set(...pos);parts.push({object:g,base:g.position.clone(),offset:new THREE.Vector3(...offset)});return g;}
function box(parent,w,h,d,pos,material,key,rounded=0){const geometry=rounded?new RoundedBoxGeometry(w,h,d,3,rounded):new THREE.BoxGeometry(w,h,d);const o=new THREE.Mesh(geometry,material);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;o.userData.key=key||parent.userData.key;parent.add(o);if(o.userData.key)pickables.push(o);return o;}
function cyl(parent,r1,r2,h,pos,material,key,segments=20){const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;o.userData.key=key||parent.userData.key;parent.add(o);if(o.userData.key)pickables.push(o);return o;}
function sphere(parent,r,pos,material,key){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material);o.position.set(...pos);o.castShadow=true;o.userData.key=key||parent.userData.key;parent.add(o);if(o.userData.key)pickables.push(o);return o;}
function rod(parent,a,b,r,material,key){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=cyl(parent,r,r,av.distanceTo(bv),av.clone().add(bv).multiplyScalar(.5).toArray(),material,key,10);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return o;}
function poly(parent,points,color=0x98a381,dashed=false){const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.10,gapSize:.055,transparent:true,opacity:.8}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.65});const l=new THREE.Line(geometry,material);if(dashed)l.computeLineDistances();parent.add(l);return l;}
const world=(x,y)=>[x/1000-1.9,2.75-y/1000];
function dimension(a,b,title,labelPos,style=''){poly(dimensions,[a,b]);const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const side=Math.abs(delta.x)>Math.abs(delta.z)?[0,0,.06]:[.06,0,0];for(const p of[a,b])poly(dimensions,[[p[0]-side[0],p[1],p[2]-side[2]],[p[0]+side[0],p[1],p[2]+side[2]]]);label(title,labelPos,style);}
function label(title,pos,style=''){const el=document.createElement('div');el.className='dimension-label '+style;el.textContent=title;$('labels').append(el);labels.push({el,pos:new THREE.Vector3(...pos),style});}
function buildRoom(){
 const floor=component(model,'floor',[0,-.085,0],[0,-.36,0]);box(floor,3.8,.15,5.5,[0,0,0],M.floor);box(floor,3.98,.055,5.68,[0,-.1,0],M.plinth);
 lowWalls=component(model,'shell',[0,0,0],[0,.05,0]);fullWalls=component(model,'shell',[0,0,0],[0,.2,0]);
 for(const [x,z,w,d] of [[0,2.81,3.92,.12],[1.96,0,.12,5.5],[-1.96,-.4375,.12,4.625],[0,-2.81,3.92,.12]])box(lowWalls,w,.26,d,[x,.13,z],M.wall);
 const walls=[[-1.96,1.4,-.4375,.12,2.8,4.625],[1.96,1.4,0,.12,2.8,5.5],[0,1.4,2.81,3.92,2.8,.12],[0,.45,-2.81,3.92,.9,.12],[0,2.6,-2.81,3.92,.4,.12]];
 for(const[x,y,z,w,h,d]of walls)box(fullWalls,w,h,d,[x,y,z],M.wall);
 box(fullWalls,.2,2.8,.6,[-1.8,1.4,-2.45],M.wall);box(lowWalls,.2,.42,.6,[-1.8,.21,-2.45],M.wall);
 // Original side opening only; no invented door swing.
 poly(lowWalls,[[-1.98,.005,1.875],[-2.15,.005,1.875],[-2.15,.005,2.75],[-1.98,.005,2.75]],0xb49460,true);
}
function hanging(parent,left,right,height=1.75){
 rod(parent,[left,height,0],[right,height,0],.012,M.rail,'main');
 const colors=['#e3d8c7','#b4bea8','#849582','#d7c6aa','#dad9ce'];
 const count=Math.max(3,Math.floor((right-left)/.11));
 for(let i=0;i<count;i++){const x=left+.05+i*(right-left-.1)/(count-1);const cm=mat(colors[i%colors.length]);const h=.64+(i%3)*.09;box(parent,.038,h,.36,[x,height-.1-h/2,0],cm,'main',.015);poly(parent,[[x,height-.015,0],[x,height-.12,-.19],[x,height-.12,.19],[x,height-.015,0]],0x8b887b);}
}
function wardrobe(){
 const w=2.9,center=.45;
 const g=group(model,'main');g.position.set(center,0,.6);
 const body=component(g,'main',[0,0,0],[0,.12,.10]);
 box(body,w,.09,.6,[0,.045,0],M.oak);box(body,.025,2.4,.6,[-w/2+.0125,1.2,0],M.cabinet);box(body,.025,2.4,.6,[w/2-.0125,1.2,0],M.cabinet);
 const sizes=[.95,.95,1];let cursor=-w/2;
 sizes.forEach((sw,index)=>{const mid=cursor+sw/2;if(index)box(body,.02,2.3,.56,[cursor,1.2,0],M.inside);
  const inner=component(g,'main',[mid,0,0],[0,.1+index*.1,.12]);
  const sh=component(inner,'main',[0,0,0],[0,.5+index*.12,0]);box(sh,sw-.04,.025,.53,[0,2.04,0],M.inside);box(inner,sw-.04,.23,.39,[0,2.19,-.015],M.linen,'main',.015);
  if(index<2)hanging(inner,-sw/2+.05,sw/2-.05,index===0?1.83:1.93);
  else for(let j=0;j<4;j++){const shelf=component(inner,'main',[0,0,0],[.18,j*.18,.14]);box(shelf,sw-.04,.025,.53,[0,.45+j*.38,0],M.inside);box(shelf,sw-.10,.12,.40,[0,.52+j*.38,-.015],j%2?M.linen:M.cloth,'main',.014);}
  for(let side=0;side<2;side++){const pw=sw/2-.009;const px=side===0?cursor+.006:cursor+sw-.006;
   const hinge=component(g,'main',[px,0,.289],[side===0?-.12:.12,.08,.9]);const sign=side===0?1:-1;box(hinge,pw,2.29,.022,[sign*pw/2,1.245,0],M.cabinet);box(hinge,.013,.19,.023,[sign*(pw-.06),1.19,0],M.brass);doorParts.push({object:hinge,sign:side===0?-1:1});
  }cursor+=sw;
 });
 const top=component(g,'main',[0,0,0],[0,1.3,0]);box(top,w,.035,.6,[0,2.3825,0],M.cabinet);
 const back=component(g,'back',[0,0,-.325],[0,.12,-.8]);box(back,w,2.4,.05,[0,1.2,0],M.background);
 // Subtle vertical grain on the bed-facing surface.
 for(let x=-w/2+.055;x<w/2;x+=.11)box(back,.006,2.26,.004,[x,1.2,-.023],M.oak,'back');
}
function lowStorage(){
 const w=.9,d=.45,start=1.6;const[x,z]=world((start+w/2)*1000,d*500);
 const g=group(model,'storage');g.position.set(x,0,z);
 const carcass=component(g,'storage',[0,0,0],[-.25,.1,.25]);box(carcass,w,.04,d,[0,.04,0],M.oak);box(carcass,w,.80,.022,[0,.40,d/2-.011],M.oak);for(const side of[-1,1])box(carcass,.022,.80,d,[side*(w/2-.011),.40,0],M.oak);
 const top=component(g,'storage',[0,0,0],[-.25,.75,.25]);box(top,w,.035,d,[0,.8325,0],M.ivory);
 for(let i=0;i<3;i++){const dr=component(g,'storage',[0,.16+i*.245,-d/2+.0175],[-.25,.12,-.5-i*.09]);box(dr,w-.03,.225,.035,[0,0,0],M.inside);box(dr,.20,.008,.03,[0,.065,0],M.brass);box(dr,w-.065,.012,d-.07,[0,-.098,(d-.07)/2],M.inside);for(const side of[-1,1])box(dr,.012,.17,d-.07,[side*(w/2-.04),-.016,(d-.07)/2],M.inside);box(dr,w-.07,.17,.012,[0,-.016,d-.07],M.inside);drawerParts.push({object:dr,axis:'z',amount:-.25,base:dr.position.clone()});}
 const tray=component(g,'storage',[0,.865,0],[-.25,.8,.2]);cyl(tray,.13,.13,.018,[0,0,0],M.oak,'storage');cyl(tray,.045,.035,.09,[.02,.045,.01],M.pot,'storage');
}
function secondary(){
 const w=.7,d=.45;const[x,z]=world((.9+w/2)*1000,d*500);const g=group(model,'secondary');g.position.set(x,0,z);
 const body=component(g,'secondary',[0,0,0],[-.65,.16,.35]);box(body,w,2.1,.02,[0,1.05,d/2-.01],M.oak);for(const x of[-w/2+.012,w/2-.012])box(body,.024,2.1,d,[x,1.05,0],M.oak);box(body,w,.04,d,[0,.06,0],M.oak);
 const top=component(g,'secondary',[0,0,0],[-.65,.85,.35]);box(top,w,.025,d,[0,2.0875,0],M.oak);box(body,w-.04,.025,d,[0,1.82,0],M.inside);
 for(let i=0;i<2;i++){const px=(i-.5)*w*.45;rod(body,[px,1.68,d/2-.03],[px,1.68,-.05],.015,M.brass,'secondary');box(body,.24,.72,.065,[px,1.22,-.055],i?M.linen:M.cloth,'secondary',.018);}
 box(body,w-.13,.34,d-.08,[0,.25,0],M.pot,'secondary',.035);
 for(let y=.12;y<.4;y+=.045)box(body,w-.12,.006,.006,[0,y,-d/2+.035],M.oak,'secondary');
}
function vanity(){
 const g=group(model,'vanity');const[x,z]=world(3150,225);g.position.set(x,0,z);
 const top=component(g,'vanity',[0,0,0],[.4,.75,.4]);
 box(top,1.3,.03,.45,[0,.735,0],M.ivory,'vanity');
 box(top,.45,.03,.65,[.425,.735,-.55],M.ivory,'vanity');
 const base=component(g,'vanity',[0,0,0],[.4,.1,.4]);
 box(base,.025,.72,.42,[-.6375,.36,0],M.oak,'vanity');
 box(base,.825,.07,.40,[-.2125,.67,0],M.oak,'vanity');
 const pedestal=component(g,'vanity_storage',[.425,0,-.625],[.8,.15,.3]);
 box(pedestal,.45,.72,.5,[0,.36,0],M.oak,'vanity_storage');
 for(let j=0;j<3;j++){box(pedestal,.016,.21,.474,[-.217,.14+j*.225,0],M.inside,'vanity_storage');box(pedestal,.012,.007,.14,[-.219,.20+j*.225,0],M.brass,'vanity_storage');}
 const mirror=component(g,'mirror',[-.10,0,.215],[.4,.6,.6]);box(mirror,.9,.8,.02,[0,1.3,0],M.brass,'mirror');box(mirror,.87,.77,.003,[0,1.3,-.008],M.mirror,'mirror');
 const stool=group(model,'stool');const[sx,sz]=world(2925,790);stool.position.set(sx,0,sz);
 const seat=component(stool,'stool',[0,0,0],[.65,.25,.2]);cyl(seat,.24,.24,.10,[0,.40,0],M.linen,'stool',32);
 for(const x of[-.13,.13])for(const z of[-.13,.13])rod(seat,[x,.35,z],[x*1.25,.015,z*1.25],.017,M.oak,'stool');
}
function bed(){
 const g=group(model,'bed');g.position.set(0,0,-.80);
 const frame=component(g,'bed',[0,0,0],[0,.12,-.7]);box(frame,1.9,.23,2.1,[0,.185,0],M.oak,'bed',.045);box(frame,1.78,.12,1.98,[0,.065,0],M.oak,'bed',.018);
 const mattress=component(g,'bed',[0,0,0],[0,.65,-.7]);box(mattress,1.8,.23,2,[0,.415,0],M.cloth,'bed',.065);
 const blanket=component(g,'bed',[0,0,0],[0,1.05,-.72]);box(blanket,1.82,.10,1.40,[0,.565,-.30],M.linen,'bed',.048);box(blanket,1.82,.075,.22,[0,.62,.30],M.linen,'bed',.025);
 const pillows=component(g,'bed',[0,0,0],[0,1.32,-.75]);for(const x of[-.455,.455]){const p=box(pillows,.74,.15,.44,[x,.60,.69],M.pillow,'bed',.07);p.rotation.x=-.08;}
}
function makePerson(parent,x,z,seated=false,rotate=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotate;parent.add(g);const m=M.person;
 if(!seated){sphere(g,.10,[0,1.60,0],m);box(g,.36,.48,.18,[0,1.23,0],m,null,.08);sphere(g,.16,[0,.96,0],m);for(const s of[-1,1]){rod(g,[s*.11,.9,0],[s*.11,.49,.015],.065,m);rod(g,[s*.11,.49,.015],[s*.11,.09,-.02],.052,m);box(g,.12,.08,.25,[s*.11,.06,-.07],m,null,.025);rod(g,[s*.21,1.4,0],[s*.27,.94,.03],.05,m);}}
 else{sphere(g,.10,[0,1.26,0],m);box(g,.34,.43,.18,[0,.92,0],m,null,.07);for(const s of[-1,1]){rod(g,[s*.11,.52,0],[s*.11,.49,.35],.065,m);rod(g,[s*.11,.49,.35],[s*.11,.08,.36],.055,m);box(g,.12,.08,.22,[s*.11,.055,.39],m,null,.02);rod(g,[s*.2,1.06,0],[s*.24,.79,.29],.046,m);}}
 return g;}
function buildDimensions(){
 dimension([-1.9,.04,-3.05],[1.9,.04,-3.05],'3800',[0,.07,-3.16]);
 dimension([-2.33,.04,-2.75],[-2.33,.04,2.75],'5500',[-2.39,.06,-.15]);
 dimension([2.19,.04,.25],[2.19,.04,2.75],'衣帽区 2500',[2.25,.08,1.50]);
 dimension([-.1,.08,.9],[-.1,.08,2.3],'主过道 1400',[-.1,.12,1.58]);
 dimension([0,.08,-2.60],[0,.08,-1.85],'床尾净距 750',[0,.12,-2.22]);
 label('入口约 875',[-2.13,.08,2.26],'note');label('通向床区 900',[-1.45,.1,.62],'note');
 poly(dimensions,[[-2.4,.035,2.3],[-1.45,.035,2.3],[-1.45,.035,-.3]],0xb19159,true);
 label('01 主柜 2900×600×2400',[.45,2.47,.6],'furniture');
 label('03 次净衣 700×450×2100',[-.65,2.16,2.52],'furniture');
 label('04 抽屉柜 900×450×850',[.15,.93,2.52],'furniture');
 label('05 转角桌 1300×1100 · H750',[1.25,.82,2.1],'furniture');
 label('09 床架 1900×2100',[0,.72,-.8],'furniture');
}
function buildPeople(){
 makePerson(personGroup,-.25,1.6,false,Math.PI);
 const[sx,sz]=world(2925,790);makePerson(personGroup,sx,sz,true,0);
 poly(personGroup,[[.725,.02,1.67],[1.325,.02,1.67],[1.325,.02,2.45],[.725,.02,2.45],[.725,.02,1.67]],0xb18465,true);
}
function rebuild(){
 clearSelection();environment?.dispose();model.traverse(o=>{if(o.geometry)o.geometry.dispose();});dimensions.traverse(o=>{if(o.geometry)o.geometry.dispose();});personGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();});
 model.clear();dimensions.clear();personGroup.clear();parts=[];doorParts=[];drawerParts=[];pickables=[];labels.forEach(l=>l.el.remove());labels=[];
 buildRoom();wardrobe();lowStorage();secondary();vanity();bed();buildDimensions();buildPeople();
 environment=buildEnvironment({model,component,box,cyl,poly,world,M,info,state,pickables,hemi,sun,fill});
 updateViewSettings();updatePlanUI();applyTransforms();
}
function updateViewSettings(){lowWalls.visible=state.walls==='low';fullWalls.visible=state.walls==='full';personGroup.visible=state.person&&explodeValue<.1;dimensions.visible=state.dimensions&&explodeValue<.1;
 for(const m of materialList){m.clippingPlanes=state.cut?[clipping]:[];m.needsUpdate=true;}
 // Room walls and glazing follow their own display control, not furniture clipping.
 for(const m of[M.wall,M.glass,M.floor,M.plinth,M.person])m.clippingPlanes=[];
}
function applyTransforms(){
 for(const p of parts)p.object.position.copy(p.base).addScaledVector(p.offset,explodeValue);
 for(const p of doorParts)p.object.rotation.y=p.sign*doorValue*Math.PI*.53;
 for(const p of drawerParts)p.object.position[p.axis]+=p.amount*doorValue;
 personGroup.visible=state.person&&explodeValue<.1;dimensions.visible=state.dimensions&&explodeValue<.1;
 if(highlight)highlight.update();
}
function updatePlanUI(){$('stage-plan').textContent='B';$('stage-name').textContent='长排背柜 · 转角梳妆';$('wardrobe-width').innerHTML='2.9<small>m</small>';showInfo();}
function showInfo(key){const d=info[key];$('selected-tag').textContent=d?'部件详情':'方案 B';$('part-title').textContent=d?d.title:'让换衣与梳妆各有位置';$('part-description').textContent=d?(typeof d.desc==='function'?d.desc():d.desc):'入口端墙依次布置次净衣、抽屉收纳和 L 形化妆桌。主过道净深 1400；右侧转角台与衣柜之间局部 750，化妆时右端柜错时开启。';$('part-dimensions').textContent=d?d.dims():'衣帽区 2500 · 主过道 1400 · 床尾净距 750';$('clear-selection').hidden=!d;}
function clearSelection(){if(highlight){scene.remove(highlight);highlight.geometry.dispose();highlight.material.dispose();highlight=null;}selection=null;showInfo();}
function select(mesh){clearSelection();if(!mesh?.userData.key)return;selection=mesh;let target=mesh;while(target.parent&&target.parent!==model&&target.parent.userData.key===mesh.userData.key)target=target.parent;highlight=new THREE.BoxHelper(target,0xaa8857);highlight.material.transparent=true;highlight.material.opacity=.6;scene.add(highlight);showInfo(mesh.userData.key);if(viewport.clientWidth<700){document.body.classList.add('panel-open');document.querySelector('.sidebar').scrollTop=$('inspector').offsetTop-65;}}
const views={iso:{position:[6.8,8.6,-7.8],target:[0,.35,0]},top:{position:[0,12,.001],target:[0,0,0]},entry:{position:[-6.8,4.3,8],target:[0,.8,1]},window:{position:[5.8,5.7,-8],target:[0,.65,0]}};
function useCamera(kind){camera=kind==='top'?orthographic:perspective;controls.object=camera;controls.enableRotate=kind!=='top';controls.mouseButtons.LEFT=kind==='top'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=kind==='top'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;resize();}
function setView(name,immediate=false){state.view=name;useCamera(name);const v=views[name];const mobile=viewport.clientWidth<500;const mult=mobile?1.90:1;const dest=new THREE.Vector3(...v.position).multiplyScalar(mult);const target=new THREE.Vector3(...v.target);if(immediate){camera.position.copy(dest);controls.target.copy(target);controls.update();}else{cameraMove={from:camera.position.clone(),to:dest,fromTarget:controls.target.clone(),toTarget:target,start:performance.now()};}document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',String(b.dataset.view===name));});}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);perspective.aspect=w/h;perspective.updateProjectionMatrix();const halfH=w<500?Math.max(4.3,3.05*h/Math.max(180,h-240)):Math.max(4.3,3.05*h/Math.max(180,h-310));orthographic.left=-halfH*w/h;orthographic.right=halfH*w/h;orthographic.top=halfH;orthographic.bottom=-halfH;orthographic.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);
controls.addEventListener('start',()=>{cameraMove=null;});
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let pointerStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY,time:performance.now()};});
renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6||performance.now()-pointerStart.time>500)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);const hit=raycaster.intersectObjects(pickables).find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return !state.cut||h.point.y<=1.2||['shell','floor'].includes(h.object.userData.key);});select(hit?.object);});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
for(const id of['cut','doors','dimensions','person'])$(id).addEventListener('change',e=>{state[id]=e.target.checked;updateViewSettings();});
$('walls').addEventListener('change',e=>{state.walls=e.target.value;updateViewSettings();});
function explodeUI(){const v=Math.round(state.explode*100);$('explode').value=v;$('explode-value').textContent=v+'%';$('explode-note').textContent=v?'拆解时隐藏尺寸与人物，避免误读距离':'从整体，看到每一层关系';}
$('explode').addEventListener('input',e=>{autoPlay=false;$('animate-explode').textContent='演示 ↗';state.explode=Number(e.target.value)/100;explodeUI();});
$('animate-explode').addEventListener('click',()=>{autoPlay=!autoPlay;if(autoPlay){autoStart=performance.now();autoBase=state.explode;}$('animate-explode').textContent=autoPlay?'停止 ■':'演示 ↗';});let autoStart=0,autoBase=0;
$('reset').addEventListener('click',()=>{state.explode=0;state.cut=false;state.doors=false;state.walls='low';state.person=false;state.dimensions=true;state.ceiling='outline';state.curtain=85;state.sheer=true;state.theme='oak';orthographic.zoom=1;syncEnvironmentUI();autoPlay=false;$('animate-explode').textContent='演示 ↗';for(const id of['cut','doors','person','dimensions'])$(id).checked=state[id];$('walls').value='low';explodeUI();clearSelection();updateViewSettings();setView('iso');});
$('clear-selection').addEventListener('click',clearSelection);
function zoom(factor){cameraMove=null;if(camera.isOrthographicCamera){camera.zoom/=factor;camera.updateProjectionMatrix();return;}camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();}
$('zoom-in').addEventListener('click',()=>zoom(.85));$('zoom-out').addEventListener('click',()=>zoom(1.18));
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else toast('此浏览器不支持全屏，请横屏查看。');}catch{toast('此浏览器暂不支持全屏。');}});
$('about').addEventListener('click',()=>$('about-dialog').showModal());document.querySelector('#about-dialog .dialog-close').addEventListener('click',()=>$('about-dialog').close());$('about-dialog').addEventListener('click',e=>{if(e.target===$('about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
let toastTimer;function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
$('share').addEventListener('click',async()=>{const url=new URL(location.href);url.search='';url.searchParams.set('v','b1400r2');url.searchParams.set('plan',state.plan);url.searchParams.set('view',state.view);url.searchParams.set('theme',state.theme);if(state.explode>.01)url.searchParams.set('explode',Math.round(state.explode*100));try{if(navigator.share&&matchMedia('(max-width:700px)').matches)await navigator.share({title:'濮院卧室 · 方案 '+state.plan,url:url.href});else{await navigator.clipboard.writeText(url.href);toast('已复制链接，包含当前方案与拆解状态');}}catch(e){if(e.name!=='AbortError')prompt('复制此链接分享',url.href);}});
$('snapshot').addEventListener('click',()=>{renderer.render(scene,camera);const output=document.createElement('canvas');const src=renderer.domElement;output.width=src.width;output.height=src.height+100;const cx=output.getContext('2d');cx.fillStyle='#f4f5ed';cx.fillRect(0,0,output.width,output.height);cx.drawImage(src,0,0);for(const l of labels){if(l.el.hidden)continue;const scale=src.width/viewport.clientWidth;const x=parseFloat(l.el.style.left)*scale,y=parseFloat(l.el.style.top)*scale;cx.font=(11*scale)+'px sans-serif';const tw=cx.measureText(l.el.textContent).width;cx.fillStyle='#fafbf4e8';cx.fillRect(x-tw/2-4*scale,y-9*scale,tw+8*scale,18*scale);cx.fillStyle='#304b3e';cx.fillText(l.el.textContent,x-tw/2,y+4*scale);}cx.fillStyle='#304b3e';cx.font='24px sans-serif';cx.fillText('濮院卧室 / 方案 '+state.plan+' · '+$('stage-name').textContent,30,src.height+43);cx.fillStyle='#808977';cx.font='16px sans-serif';cx.fillText('3800 × 5500 mm | 入口 2500 衣帽区 | 概念模型，家具与窗高待复核',30,src.height+73);const a=document.createElement('a');a.download='濮院卧室-方案'+state.plan+'.png';a.href=output.toDataURL('image/png');a.click();toast('视图已保存');});
function updateLabels(){const w=viewport.clientWidth,h=viewport.clientHeight;for(const l of labels){const visible=state.dimensions&&explodeValue<.1;const p=l.pos.clone().project(camera);const x=(p.x*.5+.5)*w,y=(-p.y*.5+.5)*h;const inBounds=p.z<1&&p.z>-1&&x>25&&x<w-25&&y>(w<500?108:145)&&y<h-(w<500?120:145);const mobileSuppressed=w<700&&(l.style==='note'||l.style==='furniture');l.el.hidden=!visible||!inBounds||mobileSuppressed;if(!l.el.hidden){l.el.style.left=x+'px';l.el.style.top=y+'px';}}}
function frame(time){requestAnimationFrame(frame);const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;if(autoPlay){const t=(time-autoStart)/1000;if(t<3)state.explode=autoBase+(1-autoBase)*(1-Math.cos(t/3*Math.PI))/2;else if(t<5)state.explode=1;else if(t<8)state.explode=(1+Math.cos((t-5)/3*Math.PI))/2;else{autoPlay=false;state.explode=0;$('animate-explode').textContent='演示 ↗';}explodeUI();}
 const f=1-Math.exp(-dt*8);explodeValue+=(state.explode-explodeValue)*f;doorValue+=((state.doors?1:0)-doorValue)*f;applyTransforms();
 if(cameraMove){const t=Math.min(1,(time-cameraMove.start)/850),s=t*t*(3-2*t);camera.position.lerpVectors(cameraMove.from,cameraMove.to,s);controls.target.lerpVectors(cameraMove.fromTarget,cameraMove.toTarget,s);if(t===1)cameraMove=null;}
 {if(!camera.isOrthographicCamera)camera.zoom=1/(1+explodeValue*.20);camera.updateProjectionMatrix();controls.update();}
 environment?.update(state,explodeValue,dt);renderer.render(scene,camera);updateLabels();updateScale();
}
rebuild();resize();setView(state.view,true);explodeUI();syncEnvironmentUI();
$('loading').remove();requestAnimationFrame(frame);
// Read-only diagnostics for reproducible geometry and interaction checks.
window.roomStudy={getState:()=>({...state,partCount:parts.length,doorCount:doorParts.length,meshCount:pickables.length}),getBounds:()=>new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray(),getSelected:()=>selection?.userData.key||null};

function syncEnvironmentUI(){
 for(const id of['sheer'])$(id).checked=state[id];
 for(const id of['curtain']){$(id).value=state[id];$(id+'-value').textContent=state[id]+'%';}
 $('ceiling').value=state.ceiling;document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('active',b.dataset.theme===state.theme));
}
for(const id of['sheer'])$(id).addEventListener('change',e=>{state[id]=e.target.checked;syncEnvironmentUI();});
for(const id of['curtain'])$(id).addEventListener('input',e=>{state[id]=Number(e.target.value);$(id+'-value').textContent=state[id]+'%';});
$('ceiling').addEventListener('change',e=>state.ceiling=e.target.value);
document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{state.theme=b.dataset.theme;syncEnvironmentUI();}));
function updateScale(){const el=document.querySelector('.scale-note');el.hidden=explodeValue>.02;if(el.hidden)return;const a=new THREE.Vector3(-.5,.01,0).project(camera),b=new THREE.Vector3(.5,.01,0).project(camera);let px=Math.hypot((a.x-b.x)*viewport.clientWidth/2,(a.y-b.y)*viewport.clientHeight/2),metres=1;while(px>150){px/=2;metres/=2;}while(px<50&&px>0){px*=2;metres*=2;}if(!Number.isFinite(px)){el.hidden=true;return;}$('scale-bar').style.width=px+'px';$('scale-text').textContent=metres+' m · '+(camera.isOrthographicCamera?'正交俯视比例尺':'地面中心投影参考');}
function closeSheet(){document.body.classList.remove('panel-open');document.querySelectorAll('[data-sheet]').forEach(b=>b.classList.remove('active'));}
document.querySelectorAll('[data-sheet]').forEach(b=>b.addEventListener('click',()=>{document.body.classList.add('panel-open');document.querySelectorAll('[data-sheet]').forEach(v=>v.classList.toggle('active',v===b));const selector={plans:'.layout-summary',finishes:'.finish-controls',more:'.controls'}[b.dataset.sheet];const panel=document.querySelector('.sidebar'),target=document.querySelector(selector);panel.scrollTop=target.offsetTop-65;}));
$('close-sheet').addEventListener('click',closeSheet);$('sheet-scrim').addEventListener('click',closeSheet);

for(const b of document.querySelectorAll('[data-dimensions]'))b.addEventListener('click',()=>{$('dimensions-dialog').showModal();$('dimensions-dialog').scrollTop=0;});
$('close-dimensions').addEventListener('click',()=>$('dimensions-dialog').close());
$('plan-zoom').addEventListener('click',()=>{const large=$('plan-drawing').classList.toggle('enlarged');$('plan-zoom').textContent=large?'适合屏幕':'放大尺寸图';});
for(const b of document.querySelectorAll('[data-part]'))b.addEventListener('click',()=>{$('dimensions-dialog').close();const mesh=pickables.find(m=>m.userData.key===b.dataset.part);select(mesh);});

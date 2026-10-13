import * as THREE from 'three';

export function buildEnvironment(api){
 const {model,component,box,cyl,poly,world,M,info,state}=api;
 const env=new THREE.Group();env.userData.key='ceiling';model.add(env);
 const white=new THREE.MeshStandardMaterial({color:0xeeeae0,roughness:.9,side:THREE.DoubleSide});
 const fabric=new THREE.MeshStandardMaterial({color:0xd5c8b3,roughness:1,side:THREE.DoubleSide});
 const sheer=new THREE.MeshStandardMaterial({color:0xf5f2e6,roughness:1,transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false});
 const solid=component(env,'ceiling',[0,0,0],[0,1.65,0]);
 // Ceiling chain: 2030 + 120 + 3155 + 200 = 5505; 5 mm rounded out of room.
 box(solid,3.8,.08,2.03,[0,2.54,1.735],white,'ceiling');
 box(solid,3.8,.08,3.15,[0,2.84,-.975],white,'ceiling');
 box(solid,3.8,.30,.12,[0,2.65,.66],white,'ceiling');
 box(solid,3.8,.07,.20,[0,2.935,-2.65],white,'ceiling');
 const outlines=component(env,'ceiling',[0,0,0],[0,1.65,0]);
 for(const[y,z0,z1]of[[2.5,.72,2.75],[2.8,-2.55,.6],[2.9,-2.75,-2.55]])poly(outlines,[[-1.9,y,z0],[1.9,y,z0],[1.9,y,z1],[-1.9,y,z1],[-1.9,y,z0]],0xa1a88f);
 const curtainPanels=[];
 // AC return/supply grilles are architectural references, not light fixtures.
 const ac=component(env,'ac',[0,0,0],[0,1.65,0]);const [ax,az]=world(600,1860);box(ac,.86,.025,.18,[ax,2.475,az],M.rail,'ac');for(let i=0;i<11;i++)box(ac,.015,.009,.16,[ax-.38+i*.076,2.455,az],M.ivory,'ac');
 const window=component(env,'window',[0,0,0],[0,.1,-.7]);
 box(window,3.6,1.8,.017,[.1,1.75,-2.785],M.glass,'window');for(const x of[-1.7,-.5,.7,1.9])box(window,.027,1.85,.04,[x,1.775,-2.77],M.rail,'window');for(const y of[.85,2.7])box(window,3.63,.028,.04,[.1,y,-2.77],M.rail,'window');
 // Detailed cloth folds on two operable halves, plus a translucent inner layer.
 const curtains=component(env,'curtain',[0,0,0],[0,.22,-1.05]);
 for(const side of[-1,1]){
  const geo=new THREE.PlaneGeometry(1.85,2.7,56,24);const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,Math.sin((x+.925)*Math.PI*14)*.04+.008*Math.sin(y*7+x*3));}geo.computeVertexNormals();
  const mesh=new THREE.Mesh(geo,fabric);mesh.position.set(side*.925,1.39,-2.65);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.key='curtain';curtains.add(mesh);api.pickables.push(mesh);curtainPanels.push({mesh,side});
 }
 const sheerPlane=new THREE.Mesh(new THREE.PlaneGeometry(3.55,2.65,1,1),sheer);sheerPlane.position.set(.1,1.4,-2.70);curtains.add(sheerPlane);
 box(curtains,3.75,.024,.06,[.02,2.775,-2.68],M.rail,'curtain');
 info.ceiling={title:'原图吊顶分区',desc:'入口段净标高 2500；主睡眠区 2800；窗侧盒体标高按原图 2900 示意。2030 + 120 + 3155 + 200 为原图长度链。模型总长按 5500 取整。',dims:()=> '入口 2500 / 主区 2800 / 窗侧盒体 2900'};
 info.curtain={title:'窗帘 / 双层轨道',desc:'沿原图窗侧与约 200 窗帘盒布置。织物、褶皱和双层做法为材质提案；窗帘高度、窗洞立面需现场复核。',dims:()=> '布帘 + 纱帘 · 窗帘盒原图约 200'};
 info.window={title:'外窗',desc:'位置沿原平面保留，窗台与窗高是三维示意，尚无该窗完整立面实测数据。',dims:()=> '示意窗台 850 / 窗高 1850，待现场复核'};
 info.ac={title:'中央空调风口',desc:'按原图入口侧机位关系示意回风/送风面，非灯具。新衣柜顶部和设备检修空间需联合深化。',dims:()=> '位置沿原图比例示意 · 风口规格待深化'};
 let lastTheme='';
 function update(current,explosion,delta=1/30){
  solid.visible=current.ceiling==='full'||explosion>.05;outlines.visible=current.ceiling==='outline'&&explosion<.05;
  solid.position.y=(current.ceiling==='off'&&explosion<.05)?0:solid.position.y;
  ac.visible=current.ceiling!=='off'||explosion>.05;
  const openness=current.curtain/100;
  curtainPanels.forEach(({mesh,side})=>{const width=1.85*(1-.8*openness);mesh.scale.x=width/1.85;mesh.position.x=side*(1.85-width/2);});
  sheerPlane.visible=current.sheer;window.visible=current.walls!=='off';
  if(lastTheme!==current.theme){lastTheme=current.theme;const dark=current.theme==='walnut';M.oak.color.set(dark?'#735039':'#c2a67f');M.background.color.set(dark?'#a58a6b':'#d3c4a9');M.cabinet.color.set(dark?'#aca58f':'#bec7b5');M.wall.color.set(dark?'#c5bdad':'#e5e6de');M.floor.color.set(dark?'#bda88a':'#ffffff');M.linen.color.set(dark?'#a89f8c':'#d4d8c7');fabric.color.set(dark?'#aaa18e':'#d5c8b3');}
 }
 return {update,dispose(){for(const m of[white,fabric,sheer])m.dispose();}};
}

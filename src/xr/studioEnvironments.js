import * as THREE from 'three';

/**
 * Lightweight, optional, raycast-inert scenery for Domistika's five studio views.
 * Geometry is visual only: never serialized, selectable, or exported as art.
 * Only one group is visible at once, and MR passthrough hides every group.
 */
export const ROOM_AMBIENCE=Object.freeze({
  home:Object.freeze({background:0x091728,floor:0x10253a,keylight:0xd6e9ff}),
  canvas:Object.freeze({background:0x241c21,floor:0x62452e,keylight:0xffd4a0}),
  spatial:Object.freeze({background:0x0d0924,floor:0x151b44,keylight:0xd8aaff}),
  workshop:Object.freeze({background:0x111d26,floor:0x293540,keylight:0x98f0e5}),
  gallery:Object.freeze({background:0x242631,floor:0x626470,keylight:0xfff1db})
});
const inertRaycast=()=>{};
const ROOMS=Object.keys(ROOM_AMBIENCE);

export function createStudioEnvironments({scene}){
  if(!scene||typeof scene.add!=='function')throw Error('Studio scenery requires a Three.js scene.');
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,12);
  const sphereGeometry=new THREE.SphereGeometry(1,10,8);
  const materials=new Map();
  const looseGeometries=[];
  const material=color=>{
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({
      color,roughness:.88,metalness:.05
    }));
    return materials.get(color);
  };
  const groups=Object.fromEntries(ROOMS.map(room=>{
    const group=new THREE.Group();
    group.name='Studio scenery: '+room;
    scene.add(group);
    return [room,group];
  }));
  function add(parent,geometry,color,position,scale){
    const mesh=new THREE.Mesh(geometry,material(color));
    mesh.name='Non-interactive studio scenery';
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.raycast=inertRaycast;
    mesh.userData.studioScenery=true;
    mesh.castShadow=false;
    mesh.receiveShadow=false;
    parent.add(mesh);
    return mesh;
  }
  function block(parent,position,scale,color){
    return add(parent,boxGeometry,color,position,scale);
  }
  function pole(parent,a,b,width,depth,color){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const delta=end.clone().sub(start),length=delta.length();
    const mesh=add(parent,boxGeometry,color,start.clone().add(end).multiplyScalar(.5).toArray(),
      [width,length,depth]);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return mesh;
  }
  function cylinder(parent,position,radius,height,color){
    return add(parent,cylinderGeometry,color,position,[radius,height,radius]);
  }
  function orb(parent,position,radius,color){
    return add(parent,sphereGeometry,color,position,[radius,radius,radius]);
  }
  function ring(parent,position,radius,color,rotation=[0,0,0]){
    const geometry=new THREE.TorusGeometry(radius,.018,4,40);
    looseGeometries.push(geometry);
    const mesh=add(parent,geometry,color,position,[1,1,1]);
    mesh.rotation.set(...rotation);
    return mesh;
  }

  // Home: architectural portico framing the existing interactive four-room picker.
  {
    const g=groups.home;
    block(g,[0,1.55,-5.65],[9,3.2,.12],0x12263a);
    block(g,[0,3.15,-5.2],[9.1,.16,.35],0x294864);
    for(const x of [-4.25,4.25]){
      block(g,[x,1.5,-4.9],[.21,3.05,.3],0x365972);
      orb(g,[x,3.02,-4.75],.12,0x9bdacb);
    }
    for(const x of [-2.8,-.95,.95,2.8]){
      block(g,[x,2.2,-5.44],[.055,.95,.08],0x2d7e8d);
      block(g,[x,.68,-5.44],[.28,.055,.09],0x678fa1);
    }
    ring(g,[0,1.7,-5.35],1.36,0x2e7888);
  }

  // Canvas Atelier: warm plaster, wood battens, windows and side shelving.
  {
    const g=groups.canvas;
    block(g,[0,1.6,-5.72],[9.4,3.35,.16],0xb99876);
    block(g,[0,.42,-5.58],[9.4,.85,.16],0x6e4c35);
    block(g,[0,3.26,-5.38],[9.45,.19,.31],0x563d31);
    for(const x of [-3.1,-2.42]){
      block(g,[x,2.12,-5.52],[.56,1.5,.08],0xafd4d5);
      block(g,[x,2.12,-5.43],[.05,1.62,.08],0xf6e4bc);
      block(g,[x,2.12,-5.42],[.6,.05,.09],0xf6e4bc);
    }
    block(g,[-2.74,2.13,-5.4],[1.6,.06,.1],0xe5ceac);
    block(g,[-2.74,.87,-5.4],[1.6,.07,.1],0xe5ceac);
    block(g,[3.1,1.13,-4.72],[1.6,.085,.45],0x76513a);
    for(let i=0;i<5;i++){
      block(g,[2.62+i*.21,1.45,-4.77],[.14,.42+(i%3)*.09,.19],
        [0x5f8191,0xc6845c,0x75805c][i%3]);
    }
    cylinder(g,[3.55,1.42,-4.52],.14,.42,0xd6c0a2);
    orb(g,[3.55,1.79,-4.52],.25,0x76906f);
    for(const x of [-3.8,-2.0,2.0,3.8]){
      pole(g,[x,.05,-4.9],[x,.05,-2.8],.045,.05,0x8c6243);
    }
    block(g,[-.25,3.18,-4.44],[.9,.08,.4],0xe6c894);
  }

  // 3D Painting: luminous but static spatial frames behind the drawing volume.
  {
    const g=groups.spatial;
    block(g,[0,1.48,-6.15],[9.7,3.2,.1],0x121333);
    for(const [x,accent] of [[-3.4,0x8c55c9],[3.4,0x2bcbc9]]){
      ring(g,[x,1.65,-5.48],1.05,accent);
      ring(g,[x,1.65,-5.46],.72,0x6680bc,[0,.3,.1]);
      pole(g,[x-.9,.4,-5.28],[x+.9,2.9,-5.28],.023,.03,accent);
    }
    for(let i=0;i<12;i++){
      const theta=i*Math.PI*2/12;
      orb(g,[Math.cos(theta)*3.8,1.65+Math.sin(theta)*1.2,-4.85],
        .055,i%3===0?0xe483dc:0x5995c9);
    }
    block(g,[0,3.05,-5.1],[3.5,.035,.07],0xd07abc);
    block(g,[0,.2,-5.1],[3.5,.035,.07],0x3c86b2);
  }

  // Forge: industrial ribs, steel panels, light strips and distant machinery.
  {
    const g=groups.workshop;
    block(g,[0,1.6,-6],[9.8,3.6,.1],0x263744);
    for(const x of [-4.4,-2.9,2.9,4.4]){
      block(g,[x,1.55,-5.57],[.2,3.1,.35],0x405868);
      block(g,[x,2.95,-5.33],[.08,.11,.12],0x7fe5d4);
    }
    block(g,[0,3.05,-5.56],[9.3,.22,.32],0x435f6b);
    block(g,[0,.44,-5.72],[9.4,.8,.18],0x1b2737);
    for(const x of [-3.55,3.55]){
      cylinder(g,[x,.42,-4.5],.43,.85,0x465869);
      cylinder(g,[x,.90,-4.5],.32,.14,0x94bdba);
      orb(g,[x,1.12,-4.5],.12,0x56debf);
      pole(g,[x-.65,.13,-4.8],[x+.65,.13,-4.8],.055,.08,0x557e80);
    }
    for(let i=0;i<5;i++){
      block(g,[-2+i,.05,-4.5],[.58,.035,2.4],i%2?0x304e5a:0x344956);
    }
  }

  // Gallery: quiet neutral architecture keeps every painted canvas in front.
  {
    const g=groups.gallery;
    block(g,[0,1.6,-5.8],[10.2,3.4,.13],0xd5d2ca);
    block(g,[0,.4,-5.64],[10.2,.82,.18],0x85868c);
    block(g,[0,3.28,-5.5],[10.2,.15,.32],0xf3e8d4);
    for(const x of [-4.8,4.8]){
      block(g,[x,1.54,-5.3],[.28,3.1,.33],0xb4b4b4);
      cylinder(g,[x,.35,-5.0],.33,.69,0x747d88);
    }
    for(const x of [-3.6,-1.8,0,1.8,3.6]){
      pole(g,[x,3.15,-5.14],[x,2.94,-5.14],.045,.06,0x464957);
      orb(g,[x,2.88,-5.14],.105,0xffedc7);
    }
    block(g,[0,.045,-4.45],[7.4,.075,1.6],0x6a6d79);
  }

  // Exactly one visible ambience, or none when scenery is off/MR is active.
  let current='home',isEnabled=true,isPassthrough=false;
  function setRoom(room,{enabled=isEnabled,passthrough=isPassthrough}={}){
    if(!Object.hasOwn(ROOM_AMBIENCE,room))throw Error('Unknown studio environment.');
    current=room;isEnabled=!!enabled;isPassthrough=!!passthrough;
    for(const [name,group] of Object.entries(groups)){
      group.visible=isEnabled&&!isPassthrough&&name===room;
    }
    return ROOM_AMBIENCE[room];
  }
  function dispose(){
    for(const group of Object.values(groups)){
      scene.remove(group);
      group.clear();
    }
    boxGeometry.dispose();cylinderGeometry.dispose();sphereGeometry.dispose();
    for(const geometry of looseGeometries)geometry.dispose();
    for(const m of materials.values())m.dispose();
  }
  setRoom('home');
  return {
    groups,setRoom,dispose,
    get room(){return current;},
    get enabled(){return isEnabled;},
    get passthrough(){return isPassthrough;}
  };
}

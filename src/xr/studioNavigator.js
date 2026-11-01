import * as THREE from 'three';

export const STUDIO_ROOMS=Object.freeze({
 home:{title:'Studio Home',hint:'Choose a creative space. Point and trigger in Quest, or click a room on desktop.'},
 canvas:{title:'Canvas Studio',hint:'Paint on a studio easel. Use the palette and trigger, or the quick tools at left.'},
 spatial:{title:'3D Painting',hint:'Draw in open space. Hold a Quest trigger or drag the mouse. Try Neon, Ribbon and Spark.'},
 workshop:{title:'Sculpture Workshop',hint:'Add shapes, select Grab / Move, then use the workshop deck.'},
 gallery:{title:'Gallery',hint:'Look around your paintings without changing their saved positions.'}
});
export const STUDIO_DESTINATIONS=Object.freeze(['canvas','spatial','workshop','gallery']);
const roomNames=[
 ['CANVAS STUDIO','Paint at an easel','#eabf76'],
 ['3D PAINTING','Create in space','#e98aca'],
 ['SCULPTURE LAB','Model and animate','#7fd5d4'],
 ['ART GALLERY','Explore your art','#a2acff']
];
function texture(top,bottom,color){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=280;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#132339';ctx.fillRect(0,0,768,280);
 ctx.strokeStyle=color;ctx.lineWidth=9;ctx.strokeRect(6,6,756,268);
 ctx.fillStyle=color;ctx.font='bold 51px system-ui';ctx.textAlign='center';
 ctx.fillText(top,384,107,735);
 ctx.fillStyle='#ecf5ff';ctx.font='29px system-ui';ctx.fillText(bottom,384,170,735);
 ctx.fillStyle='#8faabd';ctx.font='20px system-ui';ctx.fillText('POINT AND SELECT',384,235,730);
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function createStudioNavigator({scene}){
 const home=new THREE.Group();home.name='Domistika Studio Home';
 home.position.set(0,1.6,-1.7);scene.add(home);
 const backing=new THREE.Mesh(new THREE.PlaneGeometry(3.17,2.34),new THREE.MeshBasicMaterial({
  color:0x102039,transparent:true,opacity:.94,side:THREE.DoubleSide
 }));
 backing.position.z=-.035;home.add(backing);
 const title=new THREE.Mesh(new THREE.PlaneGeometry(2.75,.47),new THREE.MeshBasicMaterial({
  map:texture('CHOOSE YOUR STUDIO','FOUR CREATIVE SPACES','#f2dba3'),side:THREE.DoubleSide
 }));
 title.position.set(0,.85,.02);home.add(title);
 const controls=[];
 for(const [i,room] of STUDIO_DESTINATIONS.entries()){
  const [name,description,color]=roomNames[i];
  const tile=new THREE.Mesh(new THREE.PlaneGeometry(1.39,.65),new THREE.MeshBasicMaterial({
   map:texture(name,description,color),side:THREE.DoubleSide
  }));
  tile.position.set(i%2===0?-.75:.75,i<2?.32:-.43,.06);
  tile.name=name;tile.userData.action={type:'studio-room',value:room};
  home.add(tile);controls.push(tile);
 }
 const footer=new THREE.Mesh(new THREE.PlaneGeometry(2.5,.20),new THREE.MeshBasicMaterial({
  map:texture('YOUR ART STAYS YOURS','LOCAL FIRST','#8be6d7'),side:THREE.DoubleSide
 }));
 footer.position.set(0,-.97,.025);home.add(footer);
 const returnButton=new THREE.Mesh(new THREE.PlaneGeometry(.94,.33),new THREE.MeshBasicMaterial({
  map:texture('STUDIO HOME','RETURN TO ROOMS','#93f2d9'),side:THREE.DoubleSide,depthTest:false
 }));
 returnButton.position.set(-1.42,2.14,-1.15);
 returnButton.name='Return to Studio Home';
 returnButton.userData.action={type:'studio-room',value:'home'};
 scene.add(returnButton);controls.push(returnButton);
 const decorButton=new THREE.Mesh(new THREE.PlaneGeometry(.94,.33),new THREE.MeshBasicMaterial({
  map:texture('SCENERY','ON / OFF','#92e6e0'),side:THREE.DoubleSide,depthTest:false
 }));
 decorButton.position.set(-.23,2.14,-1.15);
 decorButton.name='Toggle Studio Scenery';
 decorButton.userData.action={type:'studio-decor'};
 scene.add(decorButton);controls.push(decorButton);
 const galleryPoses=new Map();
 let activeRoom='home';
 function leaveGallery(){
  for(const [group,pose] of galleryPoses){
   group.position.copy(pose.position);group.rotation.copy(pose.rotation);group.scale.copy(pose.scale);
  }
  galleryPoses.clear();
 }
 function showGallery(boards){
  leaveGallery();
  const n=boards.length,step=Math.min(.28,1.9/Math.max(1,n-1));
  boards.forEach((render,i)=>{
   const group=render.group;
   galleryPoses.set(group,{
    position:group.position.clone(),rotation:group.rotation.clone(),scale:group.scale.clone()
   });
   const angle=(i-(n-1)/2)*step;
   group.position.set(Math.sin(angle)*4.1,1.57,-1.7+Math.abs(Math.sin(angle))*1.35);
   group.rotation.set(0,-angle,0);
   group.scale.setScalar(Math.max(.38,Math.min(.9,3.8/Math.max(4,n))));
  });
 }
 function setRoom(room){
  if(!Object.hasOwn(STUDIO_ROOMS,room))throw Error('Unknown studio room.');
  activeRoom=room;home.visible=room==='home';returnButton.visible=room!=='home';
  decorButton.visible=room!=='home';
 }
 function setDecorState(enabled){decorButton.material.color.setHex(enabled?0xffffff:0xf7aaa4);}
 return {home,controls,setRoom,setDecorState,showGallery,leaveGallery,
  get room(){return activeRoom;},
  get isGallery(){return galleryPoses.size>0;},
  originalPose(group){return galleryPoses.get(group)||null;}
 };
}

import * as THREE from "./vendor/three.module.min.js";

const S = .02;
const palette = {
  ink: 0x26362f, green: 0x496b50, leaf: 0x6f925e, grass: 0x78956b,
  cream: 0xf2e6c9, wood: 0xb99063, woodDark: 0x72563b, orange: 0xf19a38,
  cyan: 0x61d6df, gold: 0xffcf73, asphalt: 0x4d514d, white: 0xfff8e9
};

const toWorld = (x, y) => new THREE.Vector3((x - 480) * S, 0, (y - 300) * S);
const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: 0, flatShading: true, ...options });
const basic = (color, options = {}) => new THREE.MeshBasicMaterial({ color, ...options });

function shadowMesh(geometry, mat, cast = true, receive = false) {
  const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = cast; mesh.receiveShadow = receive; return mesh;
}

function box(w, h, d, color, options = {}) {
  const { cast = true, receive = false, ...materialOptions } = options;
  return shadowMesh(new THREE.BoxGeometry(w, h, d), material(color, materialOptions), cast, receive);
}

function cylinder(r, h, color, segments = 10) {
  return shadowMesh(new THREE.CylinderGeometry(r, r, h, segments), material(color));
}

function addAt(group, object, x, y, z) { object.position.set(x, y, z); group.add(object); return object; }

function flower(group, x, y, z, color = 0xd9818b, scale = 1) {
  const bloom = shadowMesh(new THREE.DodecahedronGeometry(.09 * scale, 0), material(color));
  bloom.position.set(x,y,z); group.add(bloom); return bloom;
}

function createChair() {
  const g = new THREE.Group(), frame = material(0x6f5a3d), linen = material(0xf7efd9);
  addAt(g, shadowMesh(new THREE.BoxGeometry(.42,.10,.42), linen), 0,.46,0);
  addAt(g, shadowMesh(new THREE.BoxGeometry(.42,.42,.09), linen), 0,.76,.17);
  for(const x of [-.16,.16]) for(const z of [-.15,.15]) addAt(g, shadowMesh(new THREE.CylinderGeometry(.025,.035,.46,6), frame),x,.23,z);
  addAt(g, box(.34,.055,.045,palette.orange),0,.65,.115); return g;
}

function createTable() {
  const g = new THREE.Group();
  addAt(g,cylinder(.07,.42,palette.woodDark,8),0,.23,0); addAt(g,cylinder(.38,.06,palette.woodDark,12),0,.05,0);
  const skirt=shadowMesh(new THREE.CylinderGeometry(.55,.47,.48,16,1,true),material(0xd5c4a9,{side:THREE.DoubleSide}));skirt.position.y=.34;g.add(skirt);
  addAt(g,cylinder(.58,.09,palette.white,18),0,.61,0); addAt(g,cylinder(.1,.06,0xd2aa64,10),0,.69,0);
  flower(g,-.08,.80,0,0xce7680,1.1);flower(g,.07,.82,.02,0xf2d7c2,.9); return g;
}

function createArch() {
  const g=new THREE.Group();
  addAt(g,box(.14,1.72,.14,palette.woodDark),-.62,.86,0);addAt(g,box(.14,1.72,.14,palette.woodDark),.62,.86,0);addAt(g,box(1.38,.14,.14,palette.wood),0,1.66,0);
  addAt(g,box(.5,.08,.4,palette.woodDark),-.62,.04,0);addAt(g,box(.5,.08,.4,palette.woodDark),.62,.04,0);
  const vine=material(0x4e7048);for(let i=0;i<11;i++){const x=-.65+i*.13,leaf=shadowMesh(new THREE.IcosahedronGeometry(.12,0),vine);leaf.scale.set(1,.7,.7);leaf.position.set(x,1.7+Math.sin(i*.7)*.08,0);g.add(leaf);if(i%2===0)flower(g,x,1.82+Math.sin(i)*.05,.02,i%4?0xf0d6c4:0xcd7782,.85);}return g;
}

function createCake() {
  const g=new THREE.Group();addAt(g,cylinder(.36,.08,0x926d50,14),0,.06,0);addAt(g,cylinder(.07,.45,0x926d50,8),0,.25,0);addAt(g,cylinder(.34,.24,0xf4dfd4,16),0,.52,0);addAt(g,cylinder(.24,.23,0xfff6ec,16),0,.75,0);addAt(g,cylinder(.14,.18,0xfff9f0,14),0,.95,0);flower(g,0,1.09,0,0xd36f7c,.9);return g;
}

function createSpeaker() {
  const g=new THREE.Group();addAt(g,box(.5,.95,.46,0x252c29),0,.5,0);const coneMat=material(0x111513);for(const y of [.3,.68]){const cone=shadowMesh(new THREE.CylinderGeometry(y < .5 ? .16 : .12,y < .5 ? .16 : .12,.025,16),coneMat);cone.rotation.x=Math.PI/2;cone.position.set(0,y,.245);g.add(cone);}const lampMat=material(0x7b887f,{emissive:0x000000});const lamp=addAt(g,shadowMesh(new THREE.SphereGeometry(.045,8,6),lampMat),.17,.86,.25);g.userData.lamp=lampMat;return g;
}

function createLights() {
  const g=new THREE.Group();addAt(g,box(.66,.38,.5,0x35413b),0,.22,0);const reel=shadowMesh(new THREE.TorusGeometry(.17,.035,7,16),material(0xe1a238));reel.rotation.x=Math.PI/2;reel.position.set(0,.25,.27);g.add(reel);for(const x of [-.25,.25])addAt(g,cylinder(.045,.08,0x202724,8),x,.04,.18);const lampMat=material(0xffd26c,{emissive:0x000000});g.userData.lamp=lampMat;return g;
}

function createDolly() {
  const g=new THREE.Group();addAt(g,box(.48,.08,.58,palette.orange),0,.17,0);for(const x of [-.25,.25]){addAt(g,cylinder(.11,.08,0x202624,10),x,.1,.24).rotation.z=Math.PI/2;addAt(g,box(.06,.9,.06,palette.orange),x,.58,-.24);}addAt(g,box(.58,.07,.07,palette.orange),0,1.02,-.24);return g;
}

function createSandbag() {
  const g=new THREE.Group(),bag=shadowMesh(new THREE.SphereGeometry(.34,10,6),material(0x6f705f));bag.scale.set(1,.35,.62);bag.position.y=.12;g.add(bag);addAt(g,box(.5,.025,.025,0xa29e83),0,.24,0);return g;
}

function createItemModel(kind) {
  if(kind==="chair")return createChair();if(kind==="table")return createTable();if(kind==="arch")return createArch();if(kind==="cake")return createCake();if(kind==="speaker")return createSpeaker();if(kind==="lights")return createLights();if(kind==="dolly")return createDolly();if(kind==="sandbag")return createSandbag();return box(.5,.5,.5,0x888888);
}

function createPerson(crew=false,index=0) {
  const g=new THREE.Group(),skin=index%2?0xb97859:0xd29a78,outfits=[0x72526e,0x4e6d84,0x9b6955,0x52745b,0xb08147],shirt=crew?palette.orange:outfits[index%outfits.length];
  for(const x of [-.11,.11])addAt(g,cylinder(.075,.42,0x28302d,7),x,.22,0);
  addAt(g,shadowMesh(new THREE.CapsuleGeometry(.24,.38,4,8),material(shirt)),0,.68,0);
  for(const x of [-.3,.3]){const arm=addAt(g,cylinder(.065,.45,crew?0x345044:shirt,7),x,.67,0);arm.rotation.z=x<0?-.2:.2;}
  addAt(g,shadowMesh(new THREE.SphereGeometry(.19,10,7),material(skin)),0,1.18,0);
  const hair=shadowMesh(new THREE.SphereGeometry(.195,10,6,0,Math.PI*2,0,Math.PI/2),material(index%3?0x49352b:0xc29c61));hair.position.set(0,1.25,0);g.add(hair);
  if(crew){addAt(g,box(.47,.065,.48,0xffe7a3),0,.73,.23);addAt(g,box(.47,.065,.48,0xffe7a3),0,.9,.23);const cap=addAt(g,cylinder(.2,.09,palette.ink,10),0,1.34,0);cap.rotation.z=Math.PI/2;}
  return g;
}

function createVenue(scene, staticAnimated) {
  const lawn=box(21,.18,13.2,palette.grass,{receive:true,cast:false});lawn.position.y=-.12;scene.add(lawn);
  const venue=box(12.8,.28,11.2,0xd8c49e,{receive:true});venue.position.set(3.1,.05,.4);scene.add(venue);
  for(let z=-5;z<5.9;z+=.52){const plank=box(12.55,.025,.48,(Math.round((z+5)*10)%2)?0xddcaa4:0xcfba92,{receive:true,cast:false});plank.position.set(3.1,.205,z);scene.add(plank);}
  const staging=box(6.2,.22,5,palette.asphalt,{receive:true});staging.position.set(-6.5,.01,3.5);scene.add(staging);
  for(let x=-9.2;x<-3.4;x+=.9){const stripe=box(.035,.012,4.7,0xbab199,{cast:false});stripe.material.transparent=true;stripe.material.opacity=.22;stripe.position.set(x,.14,3.5);scene.add(stripe);}
  const hall=box(12.8,1.8,.55,0xd5c19b);hall.position.set(3.1,1.1,-5.22);scene.add(hall);const roof=box(13.15,.18,.85,0xefe0bd);roof.position.set(3.1,2.03,-5.22);scene.add(roof);
  for(let x=-2.5;x<9;x+=2.25){const window=box(1.35,.65,.05,0x71949a,{cast:false});window.material.roughness=.28;window.position.set(x,1.25,-4.925);scene.add(window);const frame=box(.08,.72,.07,palette.cream);frame.position.set(x,1.25,-4.88);scene.add(frame);}
  for(const z of [-2.5,.65]){const bed=box(7.6,.3,.38,0x344238);bed.position.set(3.5,.34,z);scene.add(bed);for(let x=0;x<7.2;x+=.52){const shrub=shadowMesh(new THREE.DodecahedronGeometry(.27+(x%1)*.04,0),material(x%1.04<.5?palette.leaf:palette.green));shrub.position.set(.05+x,.72,z);scene.add(shrub);staticAnimated.push({mesh:shrub,phase:x+z});}}
  const wallLeft=box(.22,.5,11.2,0x89775a);wallLeft.position.set(-3.31,.36,.4);scene.add(wallLeft);
  createVan(scene);createBreaker(scene);createStringLights(scene,staticAnimated);
}

function createVan(scene){const g=new THREE.Group();addAt(g,box(2.25,.82,.95,0xdedccf),0,.66,0);addAt(g,box(.72,.65,.96,0xf0eee1),.86,1.03,0);const wind=box(.38,.38,.98,0x567279);wind.position.set(1.08,1.1,0);g.add(wind);addAt(g,box(2.05,.1,1.0,palette.orange),-.1,.7,0);for(const x of [-.75,.75])for(const z of [-.49,.49]){const wheel=cylinder(.22,.15,0x202624,10);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.26,z);g.add(wheel);}g.position.set(-6.4,.12,-2.15);g.rotation.y=-.06;scene.add(g);}

function createBreaker(scene){const g=new THREE.Group();addAt(g,box(.9,1.25,.52,0x31433b),0,.63,0);addAt(g,box(.68,.83,.05,0x53675d),0,.72,.285);const lampMat=material(0x8dda72,{emissive:0x214c18,emissiveIntensity:1.3});addAt(g,shadowMesh(new THREE.SphereGeometry(.07,8,6),lampMat),.23,1.02,.33);g.position.copy(toWorld(438,525));g.position.y=.18;g.userData.lamp=lampMat;g.userData.breaker=true;scene.add(g);return g;}

function cylinderBetween(a,b,r,mat){const d=new THREE.Vector3().subVectors(b,a),m=shadowMesh(new THREE.CylinderGeometry(r,r,d.length(),7),mat,false);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());return m;}

function createStringLights(scene,animated){const g=new THREE.Group(),wire=material(0x263831),warm=material(0xffd178,{emissive:0x8c4d13,emissiveIntensity:.2});let previous=new THREE.Vector3(-2.6,3.35,-4.35);for(let i=1;i<=14;i++){const next=new THREE.Vector3(-2.6+i*.86,3.35-Math.sin(i/14*Math.PI)*.55,-4.35);g.add(cylinderBetween(previous,next,.018,wire));const bulb=shadowMesh(new THREE.SphereGeometry(.075,8,6),warm,false);bulb.position.copy(next);g.add(bulb);animated.push({mesh:bulb,bulb:true,material:warm,phase:i});previous=next;}scene.add(g);}

function createTarget(zone) {const g=new THREE.Group(),w=zone.w*S,d=zone.h*S,fill=basic(palette.cyan,{transparent:true,opacity:.08,depthWrite:false});const plane=shadowMesh(new THREE.PlaneGeometry(w,d),fill,false);plane.rotation.x=-Math.PI/2;g.add(plane);const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,.025,d)),new THREE.LineBasicMaterial({color:palette.cyan,transparent:true,opacity:.22}));edges.position.y=.015;g.add(edges);g.userData={fill,edges};return g;}

export function createWorldRenderer(canvas, world, zones) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(world.w,world.h,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x98b49b);scene.fog=new THREE.Fog(0x98b49b,18,32);
  const aspect=world.w/world.h,frustum=9.4,camera=new THREE.OrthographicCamera(-frustum*aspect/2,frustum*aspect/2,frustum/2,-frustum/2,.1,80);const cameraTarget=new THREE.Vector3(-3.6,0,3.4);
  const hemi=new THREE.HemisphereLight(0xffefd0,0x284235,2.15);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffd89b,3.4);sun.position.set(-7,16,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.bias=-.0008;scene.add(sun);
  const staticAnimated=[];createVenue(scene,staticAnimated);
  const itemModels=new Map(),guestModels=[],targetModels=new Map(),powerGroup=new THREE.Group();scene.add(powerGroup);
  for(const zone of zones){const model=createTarget(zone);const p=toWorld(zone.x+zone.w/2,zone.y+zone.h/2);model.position.set(p.x,.225,p.z);scene.add(model);targetModels.set(zone.id,model);}
  const player=createPerson(true);scene.add(player);const contextRing=shadowMesh(new THREE.RingGeometry(.46,.54,32),basic(palette.orange,{transparent:true,opacity:.88,side:THREE.DoubleSide}),false);contextRing.rotation.x=-Math.PI/2;contextRing.position.y=.24;scene.add(contextRing);
  let lastPowerKey="",lastPlayer=new THREE.Vector3(),clock=0;

  function syncItems(state){for(const item of state.items){let model=itemModels.get(item.id);if(!model){model=createItemModel(item.kind);scene.add(model);itemModels.set(item.id,model);}const p=toWorld(item.x,item.y);model.position.set(p.x,.22+(item.held ? .34 : 0),p.z);model.rotation.y=item.kind==="chair"?Math.PI:0;const lamp=model.userData.lamp;if(lamp){lamp.emissive.setHex(item.powered?0x4cff83:0x000000);lamp.emissiveIntensity=item.powered?2.4:0;}if(item.kind==="cake")model.scale.y=.82+item.durability*.06;}}
  function syncGuests(state){while(guestModels.length<state.guests.length){const model=createPerson(false,guestModels.length);scene.add(model);guestModels.push(model);}state.guests.forEach((guest,index)=>{const model=guestModels[index],p=toWorld(guest.x,guest.y);model.visible=true;model.position.set(p.x,.22+(guest.seated ? -.2 : Math.sin(clock*5+index)*.025),p.z);model.scale.y=guest.seated ? .72 : 1;});for(let i=state.guests.length;i<guestModels.length;i++)guestModels[i].visible=false;}
  function syncTargets(state){for(const zone of zones){const model=targetModels.get(zone.id),item=state.items.find(value=>value.id===zone.id);if(!item){model.visible=false;continue;}const done=Math.hypot(item.x-(zone.x+zone.w/2),item.y-(zone.y+zone.h/2))<Math.max(zone.w,zone.h)*.48,active=state.player.held?.id===zone.id;model.visible=state.phase==="setup"&&!done;model.userData.fill.opacity=active ? .4 : .055;model.userData.edges.material.opacity=active ? .95 : .14;model.position.y=active ? .255 : .225;}}
  function syncPower(state){const powered=state.items.filter(i=>i.powered).map(i=>`${i.id}:${Math.round(i.x)},${Math.round(i.y)}`).join("|");if(powered===lastPowerKey)return;lastPowerKey=powered;for(const child of [...powerGroup.children]){powerGroup.remove(child);child.geometry?.dispose();}const start=toWorld(466,505);start.y=.27;for(const item of state.items.filter(i=>i.powered)){const end=toWorld(item.x,item.y);end.y=.3;const mid=start.clone().lerp(end,.5);mid.y=.16;mid.x+=.4;const curve=new THREE.CatmullRomCurve3([start,mid,end]);powerGroup.add(shadowMesh(new THREE.TubeGeometry(curve,22,.045,7,false),material(0xe5ae37),false));}}
  function syncContext(action){if(!action||action.type==="none"||action.type==="held"){contextRing.visible=false;return;}const x=action.item?action.item.x:action.x,y=action.item?action.item.y:action.y,p=toWorld(x,y);contextRing.visible=true;contextRing.position.set(p.x,.25,p.z);contextRing.scale.setScalar(1+Math.sin(clock*6)*.09);}
  function render(state,action,dt=.016){clock+=dt;syncItems(state);syncGuests(state);syncTargets(state);syncPower(state);syncContext(action);const pp=toWorld(state.player.x,state.player.y),moved=pp.distanceTo(lastPlayer)>.002;player.position.set(pp.x,.22+(moved?Math.abs(Math.sin(clock*10))*.035:0),pp.z);if(moved){const direction=pp.clone().sub(lastPlayer);player.rotation.y=Math.atan2(direction.x,direction.z);}lastPlayer.copy(pp);
    const desired=pp.clone();cameraTarget.lerp(desired,1-Math.pow(.001,dt));camera.position.set(cameraTarget.x+7.8,cameraTarget.y+10.8,cameraTarget.z+9.4);camera.lookAt(cameraTarget.x,cameraTarget.y+.25,cameraTarget.z);
    sun.intensity=state.fuseBlown?1.2:state.phase==="ceremony"?3.8:3.4;hemi.intensity=state.fuseBlown ? .75 : 2.15;scene.background.setHex(state.fuseBlown?0x41564d:state.phase==="ceremony"?0xaab795:0x98b49b);
    for(const entry of staticAnimated){if(entry.bulb){entry.material.emissiveIntensity=state.phase==="ceremony"&&!state.fuseBlown?2.8:.2;}else entry.mesh.rotation.z=Math.sin(clock*.7+entry.phase)*.025;}
    renderer.render(scene,camera);
  }
  return {render,renderer,scene,camera};
}

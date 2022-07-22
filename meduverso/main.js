import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/FBXLoader.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.118.1/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';

const video = document.getElementsByClassName("video")[0];
console.log(video);
const html= `<video src="https://www.youtube.com/watch?v=d1sr2oWnxus" autoplay poster="posterimage.jpg">
Tu navegador no admite el elemento <code>video</code>.
</video>`;

video.appendChild(document.createElement('div')).innerHTML = html;

function updateCamera(ev) {
  let div1 = document.getElementById("div1");
  camera.position.x = 10 - window.scrollY / 500.0;
  camera.position.z = 10 - window.scrollY / 500.0;
}

window.addEventListener("scroll", updateCamera);

const house = new THREE.Group();
class BasicCharacterControllerProxy {
  constructor(animations) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
};


class BasicCharacterController {
  constructor(params) {
    this._Init(params);
  }

  _Init(params) {
    this._params = params;
    this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
    this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
    this._velocity = new THREE.Vector3(0, 0, 0);

    this._animations = {};
    this._input = new BasicCharacterControllerInput();
    this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations));

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/zombie/');
    loader.load('mremireh_o_desbiens.fbx', (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });

      this._target = fbx;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState('idle');
      };

      const _OnLoad = (animName, anim) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);
  
        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/zombie/');
      loader.load('walk.fbx', (a) => { _OnLoad('walk', a); });
      loader.load('run.fbx', (a) => { _OnLoad('run', a); });
      loader.load('idle.fbx', (a) => { _OnLoad('idle', a); });
      loader.load('dance.fbx', (a) => { _OnLoad('dance', a); });
    });
  }

  Update(timeInSeconds) {
    if (!this._target) {
      return;
    }

    this._stateMachine.Update(timeInSeconds, this._input);

    const velocity = this._velocity;
    const frameDecceleration = new THREE.Vector3(
        velocity.x * this._decceleration.x,
        velocity.y * this._decceleration.y,
        velocity.z * this._decceleration.z
    );
    frameDecceleration.multiplyScalar(timeInSeconds);
    frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
        Math.abs(frameDecceleration.z), Math.abs(velocity.z));

    velocity.add(frameDecceleration);

    const controlObject = this._target;
    const _Q = new THREE.Quaternion();
    const _A = new THREE.Vector3();
    const _R = controlObject.quaternion.clone();

    const acc = this._acceleration.clone();
    if (this._input._keys.shift) {
      acc.multiplyScalar(2.0);
    }

    if (this._stateMachine._currentState.Name == 'dance') {
      acc.multiplyScalar(0.0);
    }

    if (this._input._keys.forward) {
      velocity.z += acc.z * timeInSeconds;
    }
    if (this._input._keys.backward) {
      velocity.z -= acc.z * timeInSeconds;
    }
    if (this._input._keys.left) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }
    if (this._input._keys.right) {
      _A.set(0, 1, 0);
      _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
      _R.multiply(_Q);
    }

    controlObject.quaternion.copy(_R);

    const oldPosition = new THREE.Vector3();
    oldPosition.copy(controlObject.position);

    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(controlObject.quaternion);
    forward.normalize();

    const sideways = new THREE.Vector3(1, 0, 0);
    sideways.applyQuaternion(controlObject.quaternion);
    sideways.normalize();

    sideways.multiplyScalar(velocity.x * timeInSeconds);
    forward.multiplyScalar(velocity.z * timeInSeconds);

    controlObject.position.add(forward);
    controlObject.position.add(sideways);

    oldPosition.copy(controlObject.position);

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
};

class BasicCharacterControllerInput {
  constructor() {
    this._Init();    
  }

  _Init() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
    document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
  }

  _onKeyDown(event) {
    switch (event.keyCode) {
      case 87: // w
        this._keys.forward = true;
        break;
      case 65: // a
        this._keys.left = true;
        break;
      case 83: // s
        this._keys.backward = true;
        break;
      case 68: // d
        this._keys.right = true;
        break;
      case 32: // SPACE
        this._keys.space = true;
        break;
      case 16: // SHIFT
        this._keys.shift = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch(event.keyCode) {
      case 87: // w
        this._keys.forward = false;
        break;
      case 65: // a
        this._keys.left = false;
        break;
      case 83: // s
        this._keys.backward = false;
        break;
      case 68: // d
        this._keys.right = false;
        break;
      case 32: // SPACE
        this._keys.space = false;
        break;
      case 16: // SHIFT
        this._keys.shift = false;
        break;
    }
  }
};


class FiniteStateMachine {
  constructor() {
    this._states = {};
    this._currentState = null;
  }

  _AddState(name, type) {
    this._states[name] = type;
  }

  SetState(name) {
    const prevState = this._currentState;
    
    if (prevState) {
      if (prevState.Name == name) {
        return;
      }
      prevState.Exit();
    }

    const state = new this._states[name](this);

    this._currentState = state;
    state.Enter(prevState);
  }

  Update(timeElapsed, input) {
    if (this._currentState) {
      this._currentState.Update(timeElapsed, input);
    }
  }
};


class CharacterFSM extends FiniteStateMachine {
  constructor(proxy) {
    super();
    this._proxy = proxy;
    this._Init();
  }

  _Init() {
    this._AddState('idle', IdleState);
    this._AddState('walk', WalkState);
    this._AddState('run', RunState);
    this._AddState('dance', DanceState);
  }
};


class State {
  constructor(parent) {
    this._parent = parent;
  }

  Enter() {}
  Exit() {}
  Update() {}
};


class DanceState extends State {
  constructor(parent) {
    super(parent);

    this._FinishedCallback = () => {
      this._Finished();
    }
  }

  get Name() {
    return 'dance';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['dance'].action;
    const mixer = curAction.getMixer();
    mixer.addEventListener('finished', this._FinishedCallback);

    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.reset();  
      curAction.setLoop(THREE.LoopOnce, 1);
      curAction.clampWhenFinished = true;
      curAction.crossFadeFrom(prevAction, 0.2, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  _Finished() {
    this._Cleanup();
    this._parent.SetState('idle');
  }

  _Cleanup() {
    const action = this._parent._proxy._animations['dance'].action;
    
    action.getMixer().removeEventListener('finished', this._CleanupCallback);
  }

  Exit() {
    this._Cleanup();
  }

  Update(_) {
  }
};


class WalkState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'walk';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['walk'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'run') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (input._keys.shift) {
        this._parent.SetState('run');
      }
      return;
    }

    this._parent.SetState('idle');
  }
};


class RunState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'run';
  }

  Enter(prevState) {
    const curAction = this._parent._proxy._animations['run'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;

      curAction.enabled = true;

      if (prevState.Name == 'walk') {
        const ratio = curAction.getClip().duration / prevAction.getClip().duration;
        curAction.time = prevAction.time * ratio;
      } else {
        curAction.time = 0.0;
        curAction.setEffectiveTimeScale(1.0);
        curAction.setEffectiveWeight(1.0);
      }

      curAction.crossFadeFrom(prevAction, 0.5, true);
      curAction.play();
    } else {
      curAction.play();
    }
  }

  Exit() {
  }

  Update(timeElapsed, input) {
    if (input._keys.forward || input._keys.backward) {
      if (!input._keys.shift) {
        this._parent.SetState('walk');
      }
      return;
    }

    this._parent.SetState('idle');
  }
};


class IdleState extends State {
  constructor(parent) {
    super(parent);
  }

  get Name() {
    return 'idle';
  }

  Enter(prevState) {
    const idleAction = this._parent._proxy._animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent._proxy._animations[prevState.Name].action;
      idleAction.time = 0.0;
      idleAction.enabled = true;
      idleAction.setEffectiveTimeScale(1.0);
      idleAction.setEffectiveWeight(1.0);
      idleAction.crossFadeFrom(prevAction, 0.5, true);
      idleAction.play();
    } else {
      idleAction.play();
    }
  }

  Exit() {
  }

  Update(_, input) {
    if (input._keys.forward || input._keys.backward) {
      this._parent.SetState('walk');
    } else if (input._keys.space) {
      this._parent.SetState('dance');
    }
  }
};


class CharacterControllerDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
    });
    this._threejs.outputEncoding = THREE.sRGBEncoding;
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();

    let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    light.position.set(-100, 100, 100);
    light.target.position.set(0, 0, 0);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500.0;
    light.shadow.camera.left = 50;
    light.shadow.camera.right = -50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    this._scene.add(light);

    light = new THREE.AmbientLight(0xFFFFFF, 0.25);
    this._scene.add(light);

    const controls = new OrbitControls(
      this._camera, this._threejs.domElement);
    controls.target.set(0, 10, 0);
    controls.update();

    const loader = new THREE.CubeTextureLoader();
    const texture = new THREE.Color(0xbfd1e5);
    texture.encoding = THREE.sRGBEncoding;
    this._scene.background = texture;

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(10000, 100, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0x808080,
          }));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this._scene.add(plane);


    createHouse() 
    house.position.set(-150, 0, 0);
    this._scene.add(house);

    this._mixers = [];
    this._previousRAF = null;

    this._LoadAnimatedModel();
    this._RAF();
    

  }

  _LoadAnimatedModel() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    }
    this._controls = new BasicCharacterController(params);
  }

  _LoadAnimatedModelAndPlay(path, modelFile, animFile, offset) {
    const loader = new FBXLoader();
    loader.setPath(path);
    loader.load(modelFile, (fbx) => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });
      fbx.position.copy(offset);

      const anim = new FBXLoader();
      anim.setPath(path);
      anim.load(animFile, (anim) => {
        const m = new THREE.AnimationMixer(fbx);
        this._mixers.push(m);
        const idle = m.clipAction(anim.animations[0]);
        idle.play();
      });
      this._scene.add(fbx);
    });
  }

  _LoadModel() {
    const loader = new GLTFLoader();
    loader.load('./resources/thing.glb', (gltf) => {
      gltf.scene.traverse(c => {
        c.castShadow = true;
      });
      this._scene.add(gltf.scene);
    });
  }

  _OnWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    if (this._mixers) {
      this._mixers.map(m => m.update(timeElapsedS));
    }

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new CharacterControllerDemo();
});



function createHouse() {
  createFloor();
  // const shape = new THREE.Shape();
  // shape.moveTo(-150, 0);
  // shape.lineTo(150, 0);
  // shape.lineTo(150,100);
  // shape.lineTo(-150,100);
  // shape.lineTo(-150,0);
  
  // const window = new THREE.Path();
  // window.moveTo(30,30)
  // window.lineTo(80, 30)
  // window.lineTo(80, 80)
  // window.lineTo(30, 80);
  // window.lineTo(30, 30);
  // shape.holes.push(window);
  
  // const door = new THREE.Path();
  // door.moveTo(-30, 0)
  // door.lineTo(-30, 80)
  // door.lineTo(-80, 80)
  // door.lineTo(-80, 0);
  // door.lineTo(-30, 0);
  // shape.holes.push(door);
  
  //  const extrudeGeometry = new THREE.ExtrudeGeometry( shape ) 
  const length = 12, width = 8;
  const shape = new THREE.Shape();
shape.moveTo(-100, 0);
  shape.lineTo(150, 0);
  shape.lineTo(150,200);
  shape.lineTo(-150,100);
  shape.lineTo(-150,0);

const extrudeSettings = {
	steps: 2,
	depth: 16,
	bevelEnabled: true,
	bevelThickness: 1,
	bevelSize: 1,
	bevelOffset: 0,
	bevelSegments: 1
};

const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
const material = new THREE.VideoTexture( video );

const mesh = new THREE.Mesh( geometry, material ) ;
mesh.position.set(-200,0,0);
 
  house.add(mesh);
  
  // const texture = new THREE.TextureLoader().load('resources/img/wall.jpg');
  // texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set( 0.01, 0.005 );
  
  // const material = new THREE.MeshBasicMaterial({map: texture} );
  
  // const frontWall = new THREE.Mesh( extrudeGeometry, material ) ;
  
  // frontWall.position.z = 150;
  // frontWall.position.x = 100;
  // frontWall.rotation.y = Math.PI * 0.5;
  
  //house.add(frontWall);
  //const sideWall = createSideWall();
  //  const sideWall2 = createSideWall();
  //  sideWall2.position.z = 300;

  //createFrontWall();
  // createBackWall();

  // const roof = createRoof();
  // const roof2 = createRoof();
  // roof2.rotation.x = Math.PI / 2;
  // roof2.rotation.y = Math.PI / 4 * 0.6;
  // roof2.position.y = 130;
  // roof2.position.x = -50;
  // roof2.position.z = 155;

  // createWindow();
  // createDoor();

  // createBed();
}



function createGrass() {
const geometry = new THREE.PlaneGeometry( 10000, 10000);

const texture = new THREE.TextureLoader().load('resources/img/grass.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 100, 100 );

const grassMaterial = new THREE.MeshBasicMaterial({map: texture});

const grass = new THREE.Mesh( geometry, grassMaterial );

grass.rotation.x = -0.5 * Math.PI;

scene.add( grass );
}

function createFloor() {
const geometry = new THREE.PlaneGeometry( 200, 300);

const texture = new THREE.TextureLoader().load('resources/img/wood.jpg');
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 2, 2 );

const material = new THREE.MeshBasicMaterial({map: texture});

const floor = new THREE.Mesh( geometry, material );

floor.rotation.x = -0.5 * Math.PI;
floor.position.y = 0.4;
floor.position.z = 150;

house.add(floor);
}

function createSideWall() {
const shape = new THREE.Shape();
shape.moveTo(-100, 0);
shape.lineTo(100, 0);
shape.lineTo(100,100);
shape.lineTo(0,150);
shape.lineTo(-100,100);
shape.lineTo(-100,0);

const extrudeGeometry = new THREE.ExtrudeGeometry( shape );

const texture = new THREE.TextureLoader().load('resources/img/wall.jpg');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 0.01, 0.005 );

var material = new THREE.MeshBasicMaterial( {map: texture} );

const sideWall = new THREE.Mesh( extrudeGeometry, material ) ;

house.add(sideWall);

return sideWall;
}

function createFrontWall() {
const shape = new THREE.Shape();
shape.moveTo(-150, 0);
shape.lineTo(150, 0);
shape.lineTo(150,100);
shape.lineTo(-150,100);
shape.lineTo(-150,0);

const window = new THREE.Path();
window.moveTo(30,30)
window.lineTo(80, 30)
window.lineTo(80, 80)
window.lineTo(30, 80);
window.lineTo(30, 30);
shape.holes.push(window);

const door = new THREE.Path();
door.moveTo(-30, 0)
door.lineTo(-30, 80)
door.lineTo(-80, 80)
door.lineTo(-80, 0);
door.lineTo(-30, 0);
shape.holes.push(door);

const extrudeGeometry = new THREE.ExtrudeGeometry( shape ) 

const texture = new THREE.TextureLoader().load('resources/img/wall.jpg');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 0.01, 0.005 );

const material = new THREE.MeshBasicMaterial({map: texture} );

const frontWall = new THREE.Mesh( extrudeGeometry, material ) ;

frontWall.position.z = 150;
frontWall.position.x = 100;
frontWall.rotation.y = Math.PI * 0.5;

house.add(frontWall);
}

function createBackWall() {
const shape = new THREE.Shape();
shape.moveTo(-150, 0)
shape.lineTo(150, 0)
shape.lineTo(150,100)
shape.lineTo(-150,100);

const extrudeGeometry = new THREE.ExtrudeGeometry( shape ) 

const texture = new THREE.TextureLoader().load('resources/img/wall.jpg');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 0.01, 0.005 );

const material = new THREE.MeshBasicMaterial({map: texture});

const backWall = new THREE.Mesh( extrudeGeometry, material) ;

backWall.position.z = 150;
backWall.position.x = -100;
backWall.rotation.y = Math.PI * 0.5;

house.add(backWall);
}

function createRoof() {
const geometry = new THREE.BoxGeometry( 120, 320, 10 );

const texture = new THREE.TextureLoader().load('resources/img/tile.jpg');
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set( 5, 1);
texture.rotation = Math.PI / 2;
const textureMaterial = new THREE.MeshBasicMaterial({ map: texture});

const colorMaterial = new THREE.MeshBasicMaterial({ color: 'grey' });

const materials = [
  colorMaterial,
  colorMaterial,
  colorMaterial,
  colorMaterial,
  colorMaterial,
  textureMaterial
];

const roof = new THREE.Mesh( geometry, materials );

house.add(roof);

roof.rotation.x = Math.PI / 2;
roof.rotation.y = - Math.PI / 4 * 0.6;
roof.position.y = 130;
roof.position.x = 50;
roof.position.z = 155;

return roof;
}

function createWindow() {
const shape = new THREE.Shape();
shape.moveTo(0, 0);
shape.lineTo(0, 50)
shape.lineTo(50,50)
shape.lineTo(50,0);
shape.lineTo(0, 0);

const hole = new THREE.Path();
hole.moveTo(5,5)
hole.lineTo(5, 45)
hole.lineTo(45, 45)
hole.lineTo(45, 5);
hole.lineTo(5, 5);
shape.holes.push(hole);

const extrudeGeometry = new THREE.ExtrudeGeometry(shape);

var extrudeMaterial = new THREE.MeshBasicMaterial({ color: 'silver' });

var window = new THREE.Mesh( extrudeGeometry, extrudeMaterial ) ;
window.rotation.y = Math.PI / 2;
window.position.y = 30;
window.position.x = 100;
window.position.z = 120;

house.add(window);

return window;
}

function createDoor() {
const shape = new THREE.Shape();
shape.moveTo(0, 0);
shape.lineTo(0, 80);
shape.lineTo(50,80);
shape.lineTo(50,0);
shape.lineTo(0, 0);

const hole = new THREE.Path();
hole.moveTo(5,5);
hole.lineTo(5, 75);
hole.lineTo(45, 75);
hole.lineTo(45, 5);
hole.lineTo(5, 5);
shape.holes.push(hole);

const extrudeGeometry = new THREE.ExtrudeGeometry( shape );

const material = new THREE.MeshBasicMaterial( { color: 'silver' } );

const door = new THREE.Mesh( extrudeGeometry, material ) ;

door.rotation.y = Math.PI / 2;
door.position.y = 0;
door.position.x = 100;
door.position.z = 230;

house.add(door);
}

function createBed() {
var loader = new THREE.FBXLoader();
loader.load('./obj/bed.fbx', function ( object ) {
  object.position.x = 40;
  object.position.z = 80;
  object.position.y = 20;

  house.add( object );
} );
}
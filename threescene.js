import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {FlakesTexture } from 'three/examples/jsm/textures/FlakesTexture';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from '/node_modules/three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { PMREMGenerator } from 'three/src/extras/PMREMGenerator';

let ThreeScene =  {
 
    init(){
        this.wheel = null;
        this.spinBtn = null;
        this.model = null;
        this.bm = null;
        // console.log("initting");
        this.canvas = document.querySelector('#model');
        this.w = window.innerWidth;
        this.h = window.innerHeight/2;
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        //
        this.camera = new THREE.PerspectiveCamera(35, this.w / this.h, 0.1, 1000)
        this.camera.position.set(0, 0, 4);
        //
        this.scene = new THREE.Scene()
        this.scene.add(this.camera)
        //
        // this.light1 = new THREE.DirectionalLight( 0xffffff, 2 );
        this.light1 = new THREE.PointLight( 0xffffff,222 );
        this.light1.position.set(1,3,1);
        this.light2 = new THREE.PointLight( 0xffffff, 222);
        this.light2.position.set(-1,-2,0);
        
        
        // this.plightHelper = new THREE.PointLightHelper(this.light1, 11)
        // this.plightHelper2 = new THREE.PointLightHelper(this.light2, 11)
        
        // this.scene.add(this.plightHelper)
        // this.scene.add(this.plightHelper2)
        
        // this.scene.add(this.light1);
        // this.scene.add(this.light2);
       this.canvas.addEventListener('scroll', this.ignoreScroll, false)
    // //   window.addEventListener('resize', this.resize.bind);
        // Controls
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.enableDamping = true;
        this.controls.minDistance = 4
        this.controls.maxDistance = 7
        this.controls.maxPolarAngle = Math.PI / 2
        this.controls.maxAzimuthAngle=0.785
        this.controls.minAzimuthAngle=-1.5
        this.controls.noPan = true;
        this.controls.noKeys = true;
        this.controls.noRotate = true;
        // this.controls.autoRotate=true;
        this.controls.enableZoom = false;
        //
        //
        this.dracoLoader = new DRACOLoader()
        this.dracoLoader.setDecoderPath('./draco/')
        // console.log(this.dracoLoader);
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha:true
        })

        //
        this.renderer.setSize(this.w, this.h)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        this.renderer.toneMappingExposure = 1.4;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping

        this.shadowTx = new THREE.TextureLoader().load('./assets/shadow.webp');
        this.shadowMat = new THREE.MeshBasicMaterial({map:this.shadowTx, transparent:true, opacity:0.8}) 
        this.clrTx = new THREE.TextureLoader().load('./assets/wheel_clr.webp');
        this.clrMat = new THREE.MeshBasicMaterial({map:this.clrTx}) 
        
        this.spinNrmlMat = new THREE.CanvasTexture(new FlakesTexture());
        this.spinNrmlMat.wrapS = THREE.RepeatWrapping;
        this.spinNrmlMat.wrapT = THREE.RepeatWrapping;
        this.spinNrmlMat.repeat.x = 10;
        this.spinNrmlMat.repeat.y = 6;
        // //
        this.bm = {
            color:0x8A00D4,
            roughness: 0.3,
            metalness: .31,
            roughnessMap:this.spinNrmlMat,
            // reflectivity: .61,
            // clearcoat: .81,
            // clearcoatRoughness: .91,
            // transmission:0.01,
            normalMap:this.spinNrmlMat,
            normalScale: new THREE.Vector2(0.2, 0.2),
            side: THREE.DoubleSide
        }
        this.test = {
            color:0xD505B3,
            roughness: 0.63,
            roughnessMap:this.spinNrmlMat,
            metalness: .31,
            // clearcoat: .81,
            // clearcoatRoughness: .91,
            // transmission:0.01,
            normalMap:this.spinNrmlMat,
            normalScale: new THREE.Vector2(0.1, 0.1),
            side: THREE.DoubleSide
        }
        this.testMat = new THREE.MeshStandardMaterial(this.test);
        // this.primary = new THREE.MeshPhysicalMaterial();
        // this.primary = new THREE.MeshStandardMaterial(this.bm);
        this.primary = new THREE.MeshStandardMaterial(this.bm);
        this.gold = new THREE.MeshPhysicalMaterial(this.bm);
        this.mat6 = new THREE.MeshStandardMaterial(this.bm);
        this.mat7 = new THREE.MeshStandardMaterial(this.bm);
        this.mat8 = new THREE.MeshStandardMaterial(this.bm);
        this.mat9 = new THREE.MeshStandardMaterial(this.bm);
        // this.primary = new THREE.MeshPhysicalMaterial(this.bm);
        // //
        this.primary.color.setHex( 0x180029);
        this.gold.color.setHex( 0xfdc500 )
        this.gold.sheen = 0.4;
        this.gold.metalness = 0.7;
        this.gold.iridescence = 0.4;
        this.gold.roughness = 0.2;
        this.gold.sheenRoughness = .01;
        this.gold.clearcoat = 0.54;
        this.gold.clearcoatRoughness=0.31;
        this.mat6.color.setHex(0xFF06FF);
        this.mat7.color.setHex(0xFF4F69);
        this.mat8.color.setHex(0x5c0099);
        this.mat9.color.setHex(0x3d0066);

        this.gltfLoader = new GLTFLoader()
        this.gltfLoader.setDRACOLoader(this.dracoLoader)
        this.loadGlTF();
    },
    changeColor(clr){
        // console.log(clr)
        // this.light1.color=clr;
        let color = new THREE.Color(clr);
        
        this.light1.color.setHex( color.getHex() );
        this.light2.color.setHex( color.getHex() );
    },
    resize(){
       
        return;
        // this.w = window.innerWidth;
        // this.h = window.innerHeight/2;
        // this.canvas.width=this.w;
        // this.canvas.height=this.h;
        // this.camera.updateProjectionMatrix();
        // this.renderer.setSize(this.w, this.h);
        // this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // this.init();
    },
    ignoreScroll(e){
        e.preventDefault();
        // console.log();
    },
    loadGlTF(){
        
        this.gltfLoader.load(
            './assets/wheel.glb',
            // './assets/wheel.glb',
            // 'assets/test.glb',
            (gltf) =>{
                console.log("loaded");
                // gltf.scene.rotation.x=90-1;
                // console.log(this.primary);
                // gltf.scene.material = this.primary;
                 gltf.scene.traverse((child) =>{
                    // console.log(child.name);
                    if(child.name == 'wheel'){
                        this.wheel = child;
                        child.material=this.clrMat;
                    }else if(child.name == 'jewels1'){
                        // console.log(this.primary);
                        child.material = this.mat8;
                        
                    }else if(child.name == 'jewels2'){
                        // console.log(this.primary);
                        child.material = this.mat9;
                        // this.spinBtn = child;
                    }else if(child.name == 'bits1'){
                        // console.log(this.testMat);
                        child.material = this.mat9;
                        
                    }else if(child.name == 'bits2'){
                        // console.log(this.testMat);
                        child.material = this.mat8;
                        
                    }else if(child.name == 'bits3'){
                        // console.log(this.testMat);
                        child.material = this.gold;
                        
                    }else if(child.name == 'rings'){
                        // console.log(this.testMat);
                        child.material = this.gold;
                        
                    }else if(child.name == 'shadow'){
                        // console.log(this.testMat);
                        child.material = this.shadowMat;
                        
                    
                    }else if(child.name == 'gold'){
                        // console.log(this.testMat);
                        child.material = this.gold;
                        
                    }else{
                        child.material = this.primary;
                    }
                    
                    // if(child.name == 'jewel_001'){
                    //     // console.log(this.testMat);
                    //     child.material = this.mat6;
                        
                    // }
                    // if(child.name == 'jewel_002'){
                    //     // console.log(this.testMat);
                    //     child.material = this.mat7;
                        
                    // }
                    // if(child.name == 'rock'){
                    //     // console.log(this.testMat);
                    //     // child.material = this.mat7;
                        
                    // }
                    // if(child.name == 'jewel_003'){
                    //     // console.log(this.testMat);
                    //     child.material = this.mat8;
                        
                    // }
              
                })
                // console.log(this.scene);
                this.model = gltf.scene;
                this.scene.add(this.model)
                this.tick();
                // this.loadHDR.bind(this);
                this.loadHDR(this);
            }
            )
            // console.log(this.scene);
        },
        loadHDR(t){
       

        this.rgbeLoader = new RGBELoader();
        this.rgbeLoader.setDataType( THREE.HalfFloatType );
        t.pmremGenerator = new PMREMGenerator(this.renderer);
        //
        this.rgbeLoader.load( './assets/clouds.hdr', function ( texture ) {
            t.scene.environment = t.pmremGenerator.fromEquirectangular( texture ).texture;
            // t.scene.background = t.pmremGenerator.fromEquirectangular( texture ).texture;
            t.scene.rotation.y = 0.5
            
            t.bm.envMap=t.pmremGenerator.fromEquirectangular( texture ).texture;
           	texture.dispose();
            t.pmremGenerator.dispose();
            
        }, undefined, function ( error ) {
	        console.error( error );
        } );

    },
    tick(){
        this.counter++;
        this.controls.update()
        // Render
        if(this.wheel){
            // console.log(this.spinBtn.position.z);
            this.wheel.rotation.z+=.01;
            this.model.rotation.z-=.0006;
            // this.scene.rotateY(0.01)
            // console.log(this.scene.rotation.y)
            // this.spinBtn.position.z=Math.sin(this.wheel.rotation.z)*0.03

            // this.spinBtn.position.z=Math.sin(this.counter)
        }
        this.renderer.render(this.scene, this.camera)
    //    window.requestAnimationFrame(this.tick.bind(this))
    }
}


  
  

export default ThreeScene;
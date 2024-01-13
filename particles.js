import Noise from "./noise";

let Particles =  {
 
    init(){
      this.noise = new Noise();
      this.firstTime=true;
      // console.log("initting");
      this.canvas = document.querySelector('#particles');
      this.canvasDot = document.querySelector('#particlesDot');
      this.context = this.canvas.getContext("2d");
      this.contextDot = this.canvasDot.getContext("2d");
      this.context.globalCompositeOperation = "overlay";
      this.contextDot.globalCompositeOperation = "overlay";
      this.w = document.documentElement.clientWidth;
      this.h = document.documentElement.clientHeight/2;
      this.canvas.width = this.canvasDot.width = this.w;
      this.canvas.height =this.canvasDot.height= this.h;
      this.z=Math.random();
      this.zinc=0.01;
      this.points = [];
      this.clr = "#000";
      this.velocity = Math.random()*2-1;
      // this.velocity = -0.61;
      this.friction = 0.791 ;
      this.scale = 0.015; //0.016
      
      this.initPoints(); 
      
    },
    initPoints(){
      //
      // console.log(this.points.length);
      this.noise.seed(Math.random());
      for(let p = 0; p < this.w; p += 4) {
      // for(let p = 0; p < 10; p ++) {
        const lw = Math.random()*.015+0.05;
        // const lw = .06;
        // const lw = Math.random()*.06;
        if(this.firstTime){
          this.points.push({
            x: ((Math.random()+Math.random()+Math.random())/3)*this.w,
            // y: Math.random()*this.h, 
            // y:0,
            y:this.h/2,
            vx: (Math.random()+Math.random()+Math.random())*3-1.5,
            vy: (Math.random()+Math.random()+Math.random())*3-1.5,
            clr:this.clr,
            lw:lw,
            scale:this.scale,
            // scale:(Math.random()-Math.random())*0.1,
            // velocity:.81*(-1*(p%2))
            // velocity:81/p,
            velocity:(Math.random()*4-2)
          })
          
        }
        // console.log((Math.random()-Math.random())*0.81)
      }
      this.firstTime=false;
     
      // console.log("readu is set", this.getPoints());
      this.tick();
    },
    tick(){
      let num = this.points.length;
      this.contextDot.clearRect(0,0,this.w, this.h)
      // this.contextDot.fillRect(0,0,100, 100)
        
      for(let i = 0; i < num; i++) {
        let p = this.points[i];
        // console.log(p);
        // let value = this.getValue(p.x, p.y, p.scale);
        if(this.isDown){
          let value = this.getValue(p.x, p.y, p.scale);
          p.vx += Math.cos(value) * p.velocity;
          p.vy += Math.sin(value) * p.velocity;
        }else{
          let value = this.getValue(p.x, p.y, this.scale);
          p.vx += Math.cos(value) * this.velocity;
          p.vy += Math.sin(value) * this.velocity;
        }
        // move to current position
        this.context.beginPath();
        this.context.moveTo(p.x, p.y);

        // add velocity to position and line to new position
        p.x += p.vx;
        p.y += p.vy;
        this.context.lineTo(p.x, p.y);
        this.context.strokeStyle=this.clr;
        this.context.lineWidth=p.lw;
        this.context.stroke();
        this.contextDot.beginPath();
        this.contextDot.fillStyle=this.clr;
        this.contextDot.arc(p.x, p.y, p.lw*20, 0, 2 * Math.PI);
        this.contextDot.fill();

        // apply some friction so point doesn't speed up too much
        p.vx *= this.friction;
        p.vy *= this.friction;
        // wrap around edges of screen
        if(p.x > this.w) p.x = 0;
        if(p.y > this.h) p.y = 0;
        if(p.x < 0) p.x = this.w;
        if(p.y < 0) p.y = this.h;
      }
        this.z+=this.zinc;
    },
    getValue(x, y, scale) {
      if(this.isDown){
        return this.noise.perlin2(x * scale, y * scale) * Math.PI * 2;
        // return this.noise.perlin3(x * scale, y * scale, this.zinc) * Math.PI * 2;
      }else{
        return this.noise.perlin3(x * scale, y * scale, this.z) * Math.PI * 2;
        // return this.noise.perlin2(x * scale, y * scale) * Math.PI * 2;
       
      }
    },resize(){
      return;
      this.w = window.innerWidth;
      this.h = window.innerHeight/2;
      this.canvas.width = this.canvasDot.width = this.w;
      this.canvas.height =this.canvasDot.height= this.h;
      
      // this.contextDot.clearRect(0,0,this.w, this.h)
      // this.context.clearRect(0,0,this.w, this.h)


    }  
}


  
  

export default Particles;
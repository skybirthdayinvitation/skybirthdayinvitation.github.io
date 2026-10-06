const scenes=[...document.querySelectorAll('.scene')];
const chapterLinks=[...document.querySelectorAll('.chapters a')];
const progress=document.querySelector('.progress i');
const sequenceCanvases=[...document.querySelectorAll('[data-scroll-sequence]')];
let progressFrame=0;

const sequences=sequenceCanvases.map(canvas=>({
  canvas,
  scene:canvas.closest('.scene'),
  ctx:canvas.getContext('2d'),
  base:canvas.dataset.sequence,
  frame:0,
  lastDrawn:-1,
  images:new Map(),
  frameCount:Number(canvas.dataset.frameCount)||120,
  framesPerSheet:Number(canvas.dataset.framesPerSheet)||40,
  columns:Number(canvas.dataset.columns)||8,
  tileWidth:Number(canvas.dataset.frameWidth)||480,
  tileHeight:Number(canvas.dataset.frameHeight)||270
}));

function getSheet(sequence,index){
  if(sequence.images.has(index))return sequence.images.get(index);
  const image=new Image();
  image.decoding='async';
  sequence.images.set(index,image);
  image.onload=()=>{sequence.lastDrawn=-1;drawSequence(sequence)};
  image.onerror=()=>sequence.images.delete(index);
  image.src=`${sequence.base}-${String(index+1).padStart(2,'0')}.jpg?v=clarity3`;
  return image;
}

function drawSequence(sequence){
  const frame=sequence.frame;
  const sheetIndex=Math.floor(frame/sequence.framesPerSheet);
  const image=sequence.images.get(sheetIndex);
  if(!image?.complete||!image.naturalWidth||sequence.lastDrawn===frame)return;
  const canvas=sequence.canvas;
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);
  if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;sequence.lastDrawn=-1;}
  sequence.ctx.setTransform(dpr,0,0,dpr,0,0);
  sequence.ctx.clearRect(0,0,width,height);
  const localFrame=frame-sheetIndex*sequence.framesPerSheet;
  const sx=(localFrame%sequence.columns)*sequence.tileWidth;
  const sy=Math.floor(localFrame/sequence.columns)*sequence.tileHeight;
  const coverScale=Math.max(width/sequence.tileWidth,height/sequence.tileHeight)*1.12;
  const coverWidth=sequence.tileWidth*coverScale,coverHeight=sequence.tileHeight*coverScale;
  sequence.ctx.save();
  if('filter' in sequence.ctx)sequence.ctx.filter='blur(22px) brightness(.56) saturate(1.12)';
  sequence.ctx.drawImage(image,sx,sy,sequence.tileWidth,sequence.tileHeight,(width-coverWidth)/2,(height-coverHeight)/2,coverWidth,coverHeight);
  sequence.ctx.restore();
  const scale=sequence.scene.classList.contains('hero')?Math.max(width/sequence.tileWidth,height/sequence.tileHeight):Math.min(width/sequence.tileWidth,height/sequence.tileHeight);
  const drawWidth=sequence.tileWidth*scale,drawHeight=sequence.tileHeight*scale;
  const isPortrait=sequence.tileHeight>sequence.tileWidth;
  const x=(width-drawWidth)/2;
  sequence.ctx.drawImage(image,sx,sy,sequence.tileWidth,sequence.tileHeight,x,(height-drawHeight)/2,drawWidth,drawHeight);
  sequence.lastDrawn=frame;
}

const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(entry.isIntersecting){
      entry.target.classList.add('active');
      const index=Number(entry.target.dataset.scene);
      chapterLinks.forEach((link,i)=>link.classList.toggle('active',i===Math.min(Math.round(index*4/7),4)));
      if(index===1)entry.target.classList.add('is-active');
    }
  }
},{threshold:.48});
scenes.forEach(scene=>observer.observe(scene));

function updateProgress(){
  if(progressFrame)return;
  progressFrame=requestAnimationFrame(()=>{
    progressFrame=0;
    const max=document.documentElement.scrollHeight-innerHeight;
    progress.style.width=`${max>0?scrollY/max*100:0}%`;
    const flight=Math.min(1,Math.max(0,scrollY/innerHeight));
    document.documentElement.style.setProperty('--flight',flight.toFixed(3));
    const heroArt=document.querySelector('.hero-art');
    heroArt.style.backgroundPosition=`center ${45+flight*13}%`;

    for(const sequence of sequences){
      const rect=sequence.scene.getBoundingClientRect();
      const amount=Math.max(0,Math.min(1,-rect.top/Math.max(rect.height,1)));
      sequence.frame=Math.round(amount*(sequence.frameCount-1));
      const nearby=rect.top<innerHeight*1.5&&rect.bottom>-innerHeight;
      if(nearby){
        const sheetIndex=Math.floor(sequence.frame/sequence.framesPerSheet);
        const localFrame=sequence.frame-sheetIndex*sequence.framesPerSheet;
        getSheet(sequence,sheetIndex);
        const lastSheet=Math.ceil(sequence.frameCount/sequence.framesPerSheet)-1;
        if(sheetIndex<lastSheet&&localFrame>=Math.floor(sequence.framesPerSheet*.6))getSheet(sequence,sheetIndex+1);
        for(const [cachedIndex,image] of sequence.images){
          if(cachedIndex<sheetIndex||cachedIndex>sheetIndex+1){image.src='';sequence.images.delete(cachedIndex);}
        }
        drawSequence(sequence);
      }else if(rect.top>innerHeight*1.5||rect.bottom< -innerHeight*1.5){
        for(const image of sequence.images.values())image.src='';
        sequence.images.clear();
        sequence.lastDrawn=-1;
        sequence.ctx.clearRect(0,0,sequence.canvas.width,sequence.canvas.height);
      }
    }

    const photo=document.querySelector('.bag-direct-photo');
    if(photo){
      const rect=photo.closest('.scene').getBoundingClientRect();
      const amount=Math.max(0,Math.min(1,-rect.top/rect.height));
      photo.style.transform=`scale(${1.04+amount*.16})`;
    }
  });
}
addEventListener('scroll',updateProgress,{passive:true});
addEventListener('resize',updateProgress,{passive:true});
updateProgress();

const target=new Date('2026-10-10T18:00:00+01:00').getTime();
function countdown(){
  let left=Math.max(0,target-Date.now());
  const days=Math.floor(left/86400000);left%=86400000;
  const hours=Math.floor(left/3600000);left%=3600000;
  const minutes=Math.floor(left/60000);left%=60000;
  const seconds=Math.floor(left/1000);
  for(const [id,value] of Object.entries({days,hours,minutes,seconds}))document.getElementById(id).textContent=String(value).padStart(2,'0');
}
countdown();setInterval(countdown,1000);

const music=document.getElementById('birthday-music');
const musicToggle=document.getElementById('music-toggle');
const musicLabel=document.getElementById('music-label');
function showMusicState(playing){
  musicLabel.textContent=playing?'PAUSE MUSIC':'TAP TO PLAY';
  musicToggle.setAttribute('aria-label',playing?'Pause birthday music':'Play birthday music');
}
music.play().then(()=>showMusicState(true)).catch(()=>showMusicState(false));
musicToggle.addEventListener('click',async()=>{
  if(music.paused){
    try{await music.play();showMusicState(true);}catch{showMusicState(false);}
  }else{music.pause();showMusicState(false);musicLabel.textContent='PLAY MUSIC';}
});

<template>
  <div class="spin-battle-app">
    <div class="wrap">
      <header class="top">
        <h1>姓名戰鬥陀螺</h1>
        <button class="hallbtn" id="openHall">📜 上場紀錄</button>
      </header>

      <section id="setup">
        <div class="modes">
          <button class="modebtn active" data-mode="name">姓名對戰・三字三戰</button>
          <button class="modebtn" data-mode="name4">四字姓名對戰・四字四戰</button>
          <button class="modebtn" data-mode="single">單字對戰</button>
        </div>
        <p class="hint" id="modehint"></p>
        <p class="hint" id="sourcelink">這是一個台灣人做的小遊戲，原作者找不到，只能找到這個帖子：<a>https://x.com/satireorcry1/status/2067328444501795140?s=20</a></p>
        <div class="grid">
          <div class="pcard p1">
            <h3><span class="dot p1"></span> 玩家一</h3>
            <input class="nameinput" id="in1" maxlength="3" value="金神杖" autocomplete="off">
            <div class="pvrow" id="pvrow1"></div>
          </div>
          <div class="pcard p2">
            <h3><span class="dot p2"></span> 玩家二</h3>
            <input class="nameinput" id="in2" maxlength="3" value="藍天馬" autocomplete="off">
            <div class="pvrow" id="pvrow2"></div>
          </div>
        </div>
        <div class="startrow"><button class="startbtn" id="startBtn">開　戰</button></div>
      </section>

      <section id="battle">
        <div class="scorebar" id="scorebar"></div>
        <div class="arena-layout">
          <div class="side p1">
            <div class="teamname" id="tn1">玩家一</div>
            <div class="team" id="team1"></div>
            <canvas class="statusdiagram" id="sd1" width="172" height="128"></canvas>
            <div class="integrity"><b class="curch" id="name1">—</b>　完整度 <b id="ig1">100</b>%</div>
          </div>
          <div class="arena-center">
            <div class="arena-wrap">
              <canvas id="arena" width="520" height="520"></canvas>
              <div class="overlay" id="overlay"></div>
            </div>
            <div class="verdict" id="verdict"></div>
            <div class="controls">
              <button class="ctrlbtn primary" id="rematch">重新對戰</button>
              <button class="ctrlbtn" id="backSetup">← 回設定</button>
            </div>
            <div class="battlelog" id="log"></div>
          </div>
          <div class="side p2">
            <div class="teamname" id="tn2">玩家二</div>
            <div class="team" id="team2"></div>
            <canvas class="statusdiagram" id="sd2" width="172" height="128"></canvas>
            <div class="integrity"><b class="curch" id="name2">—</b>　完整度 <b id="ig2">100</b>%</div>
          </div>
        </div>
      </section>
    </div>

    <div class="modal" id="hallModal">
      <div class="modalbox">
        <button class="closex" id="closeHall">×</button>
        <div id="hallView">
          <h2>上場紀錄</h2>
          <div class="msub">所有曾上場的文字陀螺與戰績，點卡片看細節。</div>
          <div class="hallgrid" id="hallGrid"></div>
          <button class="clearhall" id="clearHall">清除全部紀錄</button>
        </div>
        <div id="hallDetail" style="display:none"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

// Game state is declared here (outside onMounted) so onUnmounted can
// reach it to cancel any in-flight animation frame when the user navigates away.
let game = null, GAMEREF = null, match = null

onMounted(() => {
  /* =========================================================================
     姓名戰鬥陀螺 — 剛體物理對戰
     文字＝高解析標楷體字形→磚塊節點→剛體（繞幾何中心軸心旋轉，形狀不變）。
     斷裂依字形「結構厚度」判定（細頸易斷）；偏重造成晃動與暴擊但難持久。
     ========================================================================= */
  const MASTER=300, GLYPH_FONT=210, TILE=15;
  const TOP_TARGET=72;                       // 陀螺目標直徑（更小）
  const ARENA_R=250, ARENA_CX=260, ARENA_CY=260, ARENA_INNER=ARENA_R-4;
  const BOWL=0.00018;                        // 諧振盆向心力（∝離心距離 → 橢圓繞行）
  const INWARD=0.005;                        // 持續微向心：高低轉速都緩緩趨向盆心（不外擴）
  const SUBSTEPS=2;
  const KAI='"BiauKai","DFKai-SB","TW-Kai","KaiTi TC","Kaiti TC","STKaiti","Kaiti SC","Noto Serif TC",serif';
  const INK='#1c1a17', CINNABAR='#b5302a';

  const LINDAMP=0.995, SPINFRIC=0.99996, REST=0.62, MU=0.18;
  const AV_MAX=0.72, V_MAX=15, AV_DEAD=0.05;
  const VN_HARD=1.5;                         // 斷裂門檻（更易觸發）
  const TOUGH=4.9, THK0=0.3, THKK=1.4;       // 結構頸部強度＝韌性×(基準＋頸厚×係數)；細頸弱、厚頸強
  const K_WOBBLE=0.46, K_IMBDRAIN=0.016;     // 偏重晃動（更明顯）＋耗損
  const IBOOST=3.4, GYRO_CURVE=0.05;         // 旋走：自旋使行進路徑彎曲（能量中性的橢圓繞場）
  const PRECESS=0.00035;                     // 進動：自旋帶動橢圓繞場傾向（較小，不蓋過向心）
  const SETTLE_SPIN=0.12, DEBRIS_DAMP=0.88;  // 低速沉降摩擦門檻／碎片摩擦（更快停）
  const CRIT_CHANCE=0.18, CRIT_MULT=2.3;     // 偏重暴擊
  const VIEW_KY=0.78, VIEW_KZ=0.92;          // 透視：俯角壓縮（盆面成橢圓）＋高度
  const THICK=9, MAXLEAN=1.45;               // 文字厚度（擠出）／最大傾倒角
  let SHX=0, SHY=0;                          // 震屏位移

  const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, rnd=(a,b)=>a+Math.random()*(b-a);
  function hexA(hex,a){const h=hex.replace('#','');return `rgba(${parseInt(h.substr(0,2),16)},${parseInt(h.substr(2,2),16)},${parseInt(h.substr(4,2),16)},${a})`;}
  function darken(hex,f){f=f==null?0.42:f;const h=hex.replace('#','');return `rgb(${Math.round(parseInt(h.substr(0,2),16)*f)},${Math.round(parseInt(h.substr(2,2),16)*f)},${Math.round(parseInt(h.substr(4,2),16)*f)})`;}
  function sideColor(hex){const h=hex.replace('#','');const r=parseInt(h.substr(0,2),16),g=parseInt(h.substr(2,2),16),b=parseInt(h.substr(4,2),16);
    const lum=0.3*r+0.59*g+0.11*b;
    if(lum<70) return 'rgb(120,112,100)';   // 深色（墨）：側面用暖灰當受光厚邊
    return `rgb(${Math.round(r*0.48)},${Math.round(g*0.48)},${Math.round(b*0.48)})`; }
  function projPt(x,y,z){ return [ x+SHX, ARENA_CY+(y-ARENA_CY)*VIEW_KY-(z||0)*VIEW_KZ+SHY ]; }

  /* ---------- 文字 → 剛體素材 ---------- */
  function rasterMaster(text,color){
    const cv=document.createElement('canvas'); cv.width=MASTER; cv.height=MASTER;
    const x=cv.getContext('2d'); x.fillStyle=color; x.textAlign='center'; x.textBaseline='middle';
    let fs=GLYPH_FONT; x.font=fs+'px '+KAI; x.fillText(text,MASTER/2,MASTER/2+fs*0.04);
    return cv;
  }
  function buildTop(text,color){
    const master=rasterMaster(text,color);
    const data=master.getContext('2d').getImageData(0,0,MASTER,MASTER).data;
    const cols=Math.floor(MASTER/TILE), rows=Math.floor(MASTER/TILE);
    const fill=[]; let samples=0;
    for(let r=0;r<rows;r++){fill[r]=[];for(let c=0;c<cols;c++){let n=0,t=0;
      for(let yy=2;yy<TILE;yy+=3)for(let xx=2;xx<TILE;xx+=3){t++;const px=c*TILE+xx,py=r*TILE+yy;if(data[(py*MASTER+px)*4+3]>60)n++;}
      samples=t; fill[r][c]=n;}}
    const thresh=samples*0.18;
    const solid=[]; for(let r=0;r<rows;r++){solid[r]=[];for(let c=0;c<cols;c++)solid[r][c]=fill[r][c]>thresh;}
    // 結構厚度：到背景（含界外）的最短距離
    const dist=[]; const q=[];
    for(let r=0;r<rows;r++){dist[r]=[];for(let c=0;c<cols;c++){
      if(!solid[r][c]){dist[r][c]=0;q.push([r,c]);}
      else if(r===0||c===0||r===rows-1||c===cols-1){dist[r][c]=1;q.push([r,c]);}
      else dist[r][c]=Infinity;}}
    let qi=0; while(qi<q.length){const [r,c]=q[qi++];const d=dist[r][c];
      for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]){const nr=r+dr,nc=c+dc;
        if(nr<0||nc<0||nr>=rows||nc>=cols)continue;
        if(solid[nr][nc]&&dist[nr][nc]>d+1){dist[nr][nc]=d+1;q.push([nr,nc]);}}}
    // 節點
    const nodes=[], nodeAt={};
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++) if(solid[r][c]){
      nodeAt[r+'_'+c]=nodes.length;
      nodes.push({tr:r,tc:c,mass:fill[r][c],lx:0,ly:0,comp:-1,thick:Math.min(6,dist[r][c]||1)});}
    if(!nodes.length) return null;
    // 連通元件
    let comp=0;
    for(const seed of nodes){ if(seed.comp!==-1)continue; const st=[seed]; seed.comp=comp;
      while(st.length){const nd=st.pop();
        for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc)continue;
          const j=nodeAt[(nd.tr+dr)+'_'+(nd.tc+dc)]; if(j!=null&&nodes[j].comp===-1){nodes[j].comp=comp;st.push(nodes[j]);}}}
      comp++;}
    // 質心 + 縮放
    let M=0,cx=0,cy=0,mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const n of nodes){const mx=n.tc*TILE+TILE/2,my=n.tr*TILE+TILE/2;M+=n.mass;cx+=mx*n.mass;cy+=my*n.mass;
      mnx=Math.min(mnx,mx);mxx=Math.max(mxx,mx);mny=Math.min(mny,my);mxy=Math.max(mxy,my);}
    cx/=M;cy/=M; const sc=TOP_TARGET/Math.max(mxx-mnx,mxy-mny,1);
    for(const n of nodes){n.lx=((n.tc*TILE+TILE/2)-cx)*sc;n.ly=((n.tr*TILE+TILE/2)-cy)*sc;}
    const tileDisp=TILE*sc;
    // 接合
    const joints=[],jk=new Set();
    const addJ=(i,j,k)=>{const a=Math.min(i,j),b=Math.max(i,j),key=a+'_'+b;if(jk.has(key))return;jk.add(key);joints.push({a,b,kind:k,broken:false});};
    for(const n of nodes){const i=nodeAt[n.tr+'_'+n.tc];
      [[0,1],[1,0],[1,1],[1,-1]].forEach(([dr,dc])=>{const j=nodeAt[(n.tr+dr)+'_'+(n.tc+dc)];if(j!=null)addJ(i,j,'stroke');});}
    if(comp>1){
      const byC={}; for(let k=0;k<comp;k++)byC[k]=[]; nodes.forEach((n,i)=>byC[n.comp].push(i));
      const conn=new Set([0]),rem=new Set(); for(let k=1;k<comp;k++)rem.add(k);
      while(rem.size){ let best=null,bd=1e18,bk=null;
        for(const f of rem)for(const g of conn){const A=byC[f],B=byC[g];
          for(let ai=0;ai<A.length;ai++)for(let bi=0;bi<B.length;bi++){
            const dx=nodes[A[ai]].lx-nodes[B[bi]].lx,dy=nodes[A[ai]].ly-nodes[B[bi]].ly,d=dx*dx+dy*dy;
            if(d<bd){bd=d;best=[A[ai],B[bi]];bk=f;}}}
        if(!best)break; addJ(best[0],best[1],'support'); conn.add(bk); rem.delete(bk);}
    }
    // 鄰接表（應力擴散用）
    const adj={}; for(let i=0;i<nodes.length;i++)adj[i]=[];
    for(const j of joints) if(j.kind==='stroke'){adj[j.a].push(j.b);adj[j.b].push(j.a);}
    // 幾何中心節點
    let bmnx=1e9,bmxx=-1e9,bmny=1e9,bmxy=-1e9;
    for(const n of nodes){bmnx=Math.min(bmnx,n.lx);bmxx=Math.max(bmxx,n.lx);bmny=Math.min(bmny,n.ly);bmxy=Math.max(bmxy,n.ly);}
    const gcx=(bmnx+bmxx)/2,gcy=(bmny+bmxy)/2; let centerNode=0,cb=1e18;
    for(let i=0;i<nodes.length;i++){const d=(nodes[i].lx-gcx)**2+(nodes[i].ly-gcy)**2;if(d<cb){cb=d;centerNode=i;}}

    // 從中心 BFS：深度 + 路徑樹父節點
    const depth=new Array(nodes.length).fill(-1), neckOf=new Array(nodes.length).fill(centerNode), parent=new Array(nodes.length).fill(-1);
    depth[centerNode]=0; const bq=[centerNode]; let bh2=0;
    while(bh2<bq.length){ const u=bq[bh2++];
      for(const v of adj[u]) if(depth[v]===-1){ depth[v]=depth[u]+1; parent[v]=u; bq.push(v); } }
    // 每個節點的「就近結構頸部」：往中心數 NECK_HOPS 步內最細之處（折斷較小段筆畫，可逐步削去）
    const NECK_HOPS=5;
    for(let i=0;i<nodes.length;i++){ if(depth[i]<0){neckOf[i]=i;continue;}
      let best=i,bt=nodes[i].thick,u=i;
      for(let h=0;h<NECK_HOPS&&parent[u]>=0;h++){ u=parent[u]; if(nodes[u].thick<bt){bt=nodes[u].thick;best=u;} }
      neckOf[i]=best; }

    const stats=computeStats(nodes,joints,comp);
    return {text,color,master,nodes,joints,adj,tileDisp,sc,comp,centerNode,depth,neckOf,mcx:cx,mcy:cy,origMass:M,stats};
  }

  function computeStats(nodes,joints,comp){
    const N=nodes.length; let M=0; for(const n of nodes)M+=n.mass;
    // 重量：筆畫面積／量（線性，使筆畫多寡的差異更明顯）
    const weight=Math.round(clamp(M*0.052,5,100));
    // 穩定度：重量的平衡分配（質心是否置中＋四象限質量是否均衡）
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9,gx=0,gy=0;
    for(const n of nodes){mnx=Math.min(mnx,n.lx);mxx=Math.max(mxx,n.lx);mny=Math.min(mny,n.ly);mxy=Math.max(mxy,n.ly);gx+=n.lx*n.mass;gy+=n.ly*n.mass;}
    gx/=M;gy/=M; const bw=Math.max(1,mxx-mnx),bh=Math.max(1,mxy-mny);
    const offset=Math.hypot(gx,gy)/Math.max(bw,bh);
    let q=[0,0,0,0]; for(const n of nodes)q[(n.lx>=gx?1:0)+(n.ly>=gy?2:0)]+=n.mass;
    let qvar=0; q.forEach(v=>qvar+=Math.abs(v-M/4)); qvar/=M;
    const balance=Math.round(clamp(1-(offset*1.8+qvar*1.0),0,1)*100);
    // 攻擊／防禦：外圈輪廓崎嶇（尖角突出）↔ 平滑（平直邊）
    const occ=new Set(); for(const n of nodes)occ.add(n.tr+'_'+n.tc);
    let boundary=0,spiky=0,flat=0;
    for(const n of nodes){
      let exp=0;
      if(!occ.has((n.tr-1)+'_'+n.tc))exp++;
      if(!occ.has((n.tr+1)+'_'+n.tc))exp++;
      if(!occ.has(n.tr+'_'+(n.tc-1)))exp++;
      if(!occ.has(n.tr+'_'+(n.tc+1)))exp++;
      if(exp>0){boundary++; if(exp>=2)spiky++; else flat++;}
    }
    const jag=boundary?spiky/boundary:0, smo=boundary?flat/boundary:0;
    const attack=Math.round(clamp(jag*1.2,0,1)*100);
    const defense=Math.round(clamp(smo*1.05,0,1)*100);
    // 耐久（內部用於結構抗斷，不另列）：接合密度
    const connectivity=joints.filter(j=>j.kind==='stroke').length/N;
    const durability=Math.round(clamp(connectivity*0.42-(comp-1)*0.07+0.3,0,1)*100);
    return {weight,balance,attack,defense,durability,fragCount:comp,
      atkMul:lerp(0.7,1.7,attack/100), restMul:lerp(0.8,1.25,defense/100),
      bondStrength:lerp(0.9,1.6,durability/100), spin0:lerp(0.3,0.42,(weight*0.4+balance*0.6)/100)};
  }

  /* ---------- 剛體 ---------- */
  function makeBody(top,nodeIdxs,angle,isCentral){
    let m=0,cmx=0,cmy=0,mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const i of nodeIdxs){const n=top.nodes[i];m+=n.mass;cmx+=n.lx*n.mass;cmy+=n.ly*n.mass;
      mnx=Math.min(mnx,n.lx);mxx=Math.max(mxx,n.lx);mny=Math.min(mny,n.ly);mxy=Math.max(mxy,n.ly);}
    cmx/=m;cmy/=m; const axleX=(mnx+mxx)/2,axleY=(mny+mxy)/2;
    const offX=cmx-axleX,offY=cmy-axleY,imb=Math.hypot(offX,offY);
    let Icom=0; for(const i of nodeIdxs){const n=top.nodes[i];const rx=n.lx-cmx,ry=n.ly-cmy;Icom+=n.mass*(rx*rx+ry*ry);}
    const I=Math.max(1,(Icom+m*imb*imb)*IBOOST);
    const circles=[]; let boundR=0;
    for(const i of nodeIdxs){const n=top.nodes[i];const rx=n.lx-axleX,ry=n.ly-axleY,cr=top.tileDisp*0.6;
      circles.push({rx,ry,r:cr,node:i}); boundR=Math.max(boundR,Math.hypot(rx,ry)+cr);}
    const b={top,nodeIdxs,axleLX:axleX,axleLY:axleY,offX,offY,imb,m,invM:1/m,I,invI:1/I,
      central:!!isCentral,circles,boundR,x:0,y:0,vx:0,vy:0,angle:angle||0,av:0,canvas:null,cvcx:0,cvcy:0};
    buildBodyCanvas(b); return b;
  }
  function buildBodyCanvas(b){
    const top=b.top,half=top.tileDisp/2; let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const i of b.nodeIdxs){const n=top.nodes[i];const rx=n.lx-b.axleLX,ry=n.ly-b.axleLY;
      mnx=Math.min(mnx,rx-half);mxx=Math.max(mxx,rx+half);mny=Math.min(mny,ry-half);mxy=Math.max(mxy,ry+half);}
    const pad=2,w=Math.max(1,Math.ceil(mxx-mnx)+pad*2),h=Math.max(1,Math.ceil(mxy-mny)+pad*2);
    const cv=document.createElement('canvas'); cv.width=w; cv.height=h; b.cvcx=-mnx+pad; b.cvcy=-mny+pad;
    const g=cv.getContext('2d');
    if(g&&typeof g.drawImage==='function'&&top.master){g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.save(); g.translate(b.cvcx-b.axleLX,b.cvcy-b.axleLY); paintGlyph(g,top,b.nodeIdxs); g.restore();}
    b.canvas=cv;
    // 側面：深色剪影（擠出厚度用）
    const scv=document.createElement('canvas'); scv.width=cv.width; scv.height=cv.height; const sg=scv.getContext('2d');
    if(sg&&typeof sg.drawImage==='function'){ sg.drawImage(cv,0,0); sg.globalCompositeOperation='source-in'; sg.fillStyle=sideColor(top.color); sg.fillRect(0,0,cv.width,cv.height); }
    b.sideCanvas=scv;
  }
  function paintGlyph(ctx,top,nodeIdxs){
    if(!top.master)return; ctx.save(); ctx.scale(top.sc,top.sc); ctx.translate(-top.mcx,-top.mcy);
    ctx.beginPath(); for(const i of nodeIdxs){const n=top.nodes[i];ctx.rect(n.tc*TILE-0.5,n.tr*TILE-0.5,TILE+1,TILE+1);}
    ctx.clip(); try{ctx.drawImage(top.master,0,0);}catch(e){} ctx.restore();
  }
  function worldCircles(b){const cos=Math.cos(b.angle),sin=Math.sin(b.angle),out=[];
    for(const c of b.circles)out.push({x:b.x+cos*c.rx-sin*c.ry,y:b.y+sin*c.rx+cos*c.ry,r:c.r,node:c.node});return out;}

  function stepBody(b){
    const rx0=b.x-ARENA_CX, ry0=b.y-ARENA_CY, spd=Math.abs(b.av);
    if(b.central){
      b.vx+=-rx0*BOWL; b.vy+=-ry0*BOWL;                  // 諧振盆：與離心距離成正比（橢圓繞行）
      const dist=Math.hypot(rx0,ry0);
      if(dist>2){ const inv=INWARD/dist; b.vx+=-rx0*inv; b.vy+=-ry0*inv; } // 持續微向心 → 始終略往中心
    }
    // 偏重離心晃動（高速時，重側朝外甩 → 間歇強擊）
    if(b.central&&b.imb>0.3){
      const cos=Math.cos(b.angle),sin=Math.sin(b.angle);
      const owx=cos*b.offX-sin*b.offY,owy=sin*b.offX+cos*b.offY;
      b.vx+=b.av*b.av*owx*K_WOBBLE; b.vy+=b.av*b.av*owy*K_WOBBLE;
    }
    if(spd>0.012){const a=GYRO_CURVE*b.av,ca=Math.cos(a),sa=Math.sin(a);
      const nvx=ca*b.vx-sa*b.vy,nvy=sa*b.vx+ca*b.vy; b.vx=nvx; b.vy=nvy;}
    // 阻尼：碎片摩擦大很快停下；主體在低速時加大摩擦，使移動平順歸零
    let damp;
    if(!b.central) damp=DEBRIS_DAMP;
    else if(spd<SETTLE_SPIN) damp=lerp(0.9,LINDAMP,spd/SETTLE_SPIN);
    else damp=LINDAMP;
    b.vx*=damp; b.vy*=damp; b.vx=clamp(b.vx,-V_MAX,V_MAX); b.vy=clamp(b.vy,-V_MAX,V_MAX);
    b.x+=b.vx; b.y+=b.vy; b.angle+=b.av;
    b.av*=SPINFRIC;
    if(b.central&&b.imb>0.3) b.av*=(1-K_IMBDRAIN*clamp(b.imb/TOP_TARGET,0,0.5));
    if(b.central&&spd<SETTLE_SPIN) b.av*=0.99;     // 低速自旋更快收斂歸零
    b.av=clamp(b.av,-AV_MAX,AV_MAX); b.tilt=0;
    const dx=b.x-ARENA_CX,dy=b.y-ARENA_CY,dist=Math.hypot(dx,dy)||1e-6,lim=ARENA_INNER-b.boundR*0.55;
    if(dist>lim){const nx=dx/dist,ny=dy/dist; b.x=ARENA_CX+nx*lim; b.y=ARENA_CY+ny*lim;
      const vn=b.vx*nx+b.vy*ny; if(vn>0){b.vx-=1.7*vn*nx; b.vy-=1.7*vn*ny;}}
  }

  /* ---------- 碰撞（剛體脈衝 + 偏重暴擊 + 特效） ---------- */
  function collidePair(A,B,fx,stressA,stressB){
    const dx=B.x-A.x,dy=B.y-A.y,rr=A.boundR+B.boundR;
    if(dx*dx+dy*dy>rr*rr) return 0;
    const dl=Math.hypot(dx,dy)||1, ux0=dx/dl, uy0=dy/dl;
    // 偏重「重側朝向對手」→ 強力打擊/暴擊
    const power=(body,sx,sy)=>{
      if(body.imb<0.3) return {p:1,crit:false};
      const cos=Math.cos(body.angle),sin=Math.sin(body.angle);
      let ox=cos*body.offX-sin*body.offY, oy=sin*body.offX+cos*body.offY; const ol=Math.hypot(ox,oy)||1; ox/=ol;oy/=ol;
      const lead=Math.max(0,ox*sx+oy*sy), imbN=clamp(body.imb/TOP_TARGET,0,0.6);
      let p=1+lead*imbN*2.0, crit=false;
      if(lead>0.45&&imbN>0.12&&Math.random()<CRIT_CHANCE){p*=CRIT_MULT;crit=true;}
      return {p,crit};
    };
    const pa=power(A,ux0,uy0), pb=power(B,-ux0,-uy0);
    const ca=worldCircles(A), cb=worldCircles(B);
    const gs=A.top.tileDisp*1.4, grid={}, key=(gx,gy)=>gx+'#'+gy;
    for(let i=0;i<cb.length;i++){const p=cb[i];const gx=Math.floor(p.x/gs),gy=Math.floor(p.y/gs);(grid[key(gx,gy)]||(grid[key(gx,gy)]=[])).push(i);}
    let totalJ=0,hx=0,hy=0,hits=0;
    for(const a of ca){const gx=Math.floor(a.x/gs),gy=Math.floor(a.y/gs);
      for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){const cell=grid[key(gx+ox,gy+oy)];if(!cell)continue;
        for(const bi of cell){const b=cb[bi];
          let nx=b.x-a.x,ny=b.y-a.y,d=Math.hypot(nx,ny),minD=a.r+b.r;
          if(d>=minD||d<1e-6)continue;
          const ux=nx/d,uy=ny/d,pen=minD-d,totInv=A.invM+B.invM,corr=pen*0.6;
          A.x-=ux*corr*(A.invM/totInv);A.y-=uy*corr*(A.invM/totInv);
          B.x+=ux*corr*(B.invM/totInv);B.y+=uy*corr*(B.invM/totInv);
          const rAx=a.x-A.x,rAy=a.y-A.y,rBx=b.x-B.x,rBy=b.y-B.y;
          const vAx=A.vx-A.av*rAy,vAy=A.vy+A.av*rAx,vBx=B.vx-B.av*rBy,vBy=B.vy+B.av*rBx;
          const rvx=vBx-vAx,rvy=vBy-vAy,vn=rvx*ux+rvy*uy;
          if(vn<0){
            const rAcn=rAx*uy-rAy*ux,rBcn=rBx*uy-rBy*ux;
            const invSum=A.invM+B.invM+rAcn*rAcn*A.invI+rBcn*rBcn*B.invI;
            const e=REST*0.5*(A.top.stats.restMul+B.top.stats.restMul);
            let jn=-(1+e)*vn/invSum; jn*=0.65;
            A.vx-=jn*A.invM*ux;A.vy-=jn*A.invM*uy;A.av-=rAcn*jn*A.invI;
            B.vx+=jn*B.invM*ux;B.vy+=jn*B.invM*uy;B.av+=rBcn*jn*B.invI;
            const tx=-uy,ty=ux,vt=rvx*tx+rvy*ty,rAct=rAx*ty-rAy*tx,rBct=rBx*ty-rBy*tx;
            const invSumT=A.invM+B.invM+rAct*rAct*A.invI+rBct*rBct*B.invI;
            let jt=-vt/invSumT; jt*=0.5; const lim=MU*Math.abs(jn*2); jt=clamp(jt,-lim,lim);
            A.vx-=jt*A.invM*tx;A.vy-=jt*A.invM*ty;A.av-=rAct*jt*A.invI;
            B.vx+=jt*B.invM*tx;B.vy+=jt*B.invM*ty;B.av+=rBct*jt*B.invI;
            const approach=-vn;
            if(approach>VN_HARD){
              const dA=approach*B.top.stats.atkMul*pb.p, dB=approach*A.top.stats.atkMul*pa.p;
              if(dA>(stressA[a.node]||0))stressA[a.node]=dA;
              if(dB>(stressB[b.node]||0))stressB[b.node]=dB;
            }
            totalJ+=Math.abs(jn)+Math.abs(jt); hx+=(a.x+b.x)/2; hy+=(a.y+b.y)/2; hits++;
          }
        }}}
    if(hits>0){
      hx/=hits;hy/=hits;
      const crit=pa.crit||pb.crit;
      if(crit){ // 暴擊：額外撞飛 + 強震 + 大特效
        const atk=pa.crit?A:B, def=pa.crit?B:A, sgn=pa.crit?1:-1;
        def.vx+=ux0*sgn*3.2; def.vy+=uy0*sgn*3.2; atk.av*=0.93;
        addImpact(fx,hx,hy,8,'#b5302a',true);
        if(GAMEREF){GAMEREF.shake=Math.max(GAMEREF.shake,9); logMsg(`「${atk.top.text}」偏重蓄力，使出強力一擊！`);}
      } else if(totalJ>1.0){
        addImpact(fx,hx,hy,totalJ,A.top.color,false);
        if(GAMEREF)GAMEREF.shake=Math.max(GAMEREF.shake,Math.min(4,1+totalJ*0.3));
      }
    }
    return totalJ;
  }

  /* ---------- 結構斷裂：應力擴散到細頸，厚度決定強度 ---------- */
  function applyFracture(top,bodies,stress,fx){
    // 結構應力：把每個受擊點的撞擊應力導向該筆畫通往中心路徑上的「最細頸部」（應力集中、最易折斷處）
    const neckStress={};
    for(const k in stress){ const i=+k, s=stress[k]; if(s<=0)continue;
      const nk=(top.neckOf&&top.neckOf[i]!=null)?top.neckOf[i]:i;
      if(s>(neckStress[nk]||0)) neckStress[nk]=s;
    }
    const result=[];
    for(const b of bodies){
      const nodeSet=new Set(b.nodeIdxs); let broke=false; const bs=top.stats.bondStrength;
      // 頸部折斷：沿結構蔓延整個細頸橫斷面，折斷朝中心側的接合 → 整段筆畫折離
      for(const k in neckStress){ const nk=+k; if(!nodeSet.has(nk))continue;
        const strength=TOUGH*bs*(THK0+top.nodes[nk].thick*THKK);
        if(neckStress[k]<=strength) continue;
        const nThick=top.nodes[nk].thick, dnk0=top.depth[nk], seen=new Set([nk]), stk=[nk];
        while(stk.length){ const u=stk.pop(), du=top.depth[u];
          for(const j of top.joints){
            if(j.broken||j.kind!=='stroke'||!nodeSet.has(j.a)||!nodeSet.has(j.b))continue;
            const other=j.a===u?j.b:(j.b===u?j.a:-1); if(other<0)continue;
            if(top.depth[other]>=0&&top.depth[other]<du){ j.broken=true; broke=true; }
          }
          for(const v of top.adj[u]){ if(seen.has(v)||!nodeSet.has(v))continue;
            if(top.depth[v]>=0&&top.nodes[v].thick<=nThick+1&&Math.abs(top.depth[v]-dnk0)<=1){ seen.add(v); stk.push(v); } }
        }
      }
      // 分離筆畫的支撐連結：受擊即易斷
      for(const j of top.joints){
        if(j.broken||j.kind!=='support'||!nodeSet.has(j.a)||!nodeSet.has(j.b))continue;
        const s=Math.max(stress[j.a]||0,stress[j.b]||0);
        if(s>TOUGH*bs*0.5){ j.broken=true; broke=true; }
      }
      if(!broke){result.push(b);continue;}
      const idxArr=b.nodeIdxs,pos={}; idxArr.forEach((v,k)=>pos[v]=k);
      const parent=idxArr.map((_,k)=>k);
      const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};
      const uni=(a,c)=>{a=find(a);c=find(c);if(a!==c)parent[a]=c;};
      for(const j of top.joints) if(!j.broken&&nodeSet.has(j.a)&&nodeSet.has(j.b)) uni(pos[j.a],pos[j.b]);
      const groups={}; for(let k=0;k<idxArr.length;k++){const r=find(k);(groups[r]||(groups[r]=[])).push(idxArr[k]);}
      const gkeys=Object.keys(groups);
      if(gkeys.length<=1){result.push(b);continue;}
      for(const gk of gkeys){
        const gn=groups[gk], isC=gn.indexOf(top.centerNode)>=0, nb=makeBody(top,gn,b.angle,isC);
        const cos=Math.cos(b.angle),sin=Math.sin(b.angle),dlx=nb.axleLX-b.axleLX,dly=nb.axleLY-b.axleLY;
        nb.x=b.x+(cos*dlx-sin*dly); nb.y=b.y+(sin*dlx+cos*dly); nb.angle=b.angle;
        const rx=nb.x-b.x,ry=nb.y-b.y; nb.vx=b.vx-b.av*ry; nb.vy=b.vy+b.av*rx;
        if(isC){nb.av=b.av;}
        else{nb.av=(Math.random()-0.5)*0.05; const dd=Math.hypot(rx,ry)||1; nb.vx+=rx/dd*2.0; nb.vy+=ry/dd*2.0;
          if(fx)addImpact(fx,nb.x,nb.y,4,top.color,false);}
        result.push(nb);
      }
    }
    return result;
  }

  /* ---------- 特效 ---------- */
  function addImpact(fx,x,y,power,color,crit){
    if(!fx)return;
    fx.push({t:'r',x,y,life:1,decay:crit?0.045:0.08,c:crit?'#b5302a':color,r0:crit?12:5,r1:crit?54:24});
    const n=crit?16:Math.min(11,3+(power|0));
    for(let i=0;i<n;i++){const a=Math.random()*6.283,sp=rnd(crit?2.4:1,crit?7:3.6);
      fx.push({t:'d',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,decay:rnd(0.03,0.07),
        c:Math.random()<0.5?color:'#1c1a17',r:rnd(1.2,crit?3.6:2.4)});}
    if(crit) fx.push({t:'r',x,y,life:1,decay:0.035,c:'#b5302a',r0:4,r1:78});
  }

  /* ---------- 渲染 ---------- */
  // 立體渲染：擠出厚度的堆疊剪影 + 透視投影 + 真實 3D 傾倒
  function drawBody3D(ctx,b){
    if(!b.canvas)return;
    const a=b.angle, beta=(b.tilt||0)*MAXLEAN, psi=b.wobblePhase||0;
    // 軸向 u：直立時(0,0,1)；傾倒時朝 psi 方向倒下 beta
    const ux=Math.sin(beta)*Math.cos(psi), uy=Math.sin(beta)*Math.sin(psi), uz=Math.cos(beta);
    // 面內自旋基底 e1（隨自旋轉），e2 = u × e1
    let hx=Math.cos(a),hy=Math.sin(a); const hd=hx*ux+hy*uy;
    let e1x=hx-hd*ux,e1y=hy-hd*uy,e1z=-hd*uz; const el=Math.hypot(e1x,e1y,e1z)||1; e1x/=el;e1y/=el;e1z/=el;
    const e2x=uy*e1z-uz*e1y,e2y=uz*e1x-ux*e1z,e2z=ux*e1y-uy*e1x;
    const s1x=e1x, s1y=e1y*VIEW_KY-e1z*VIEW_KZ, s2x=e2x, s2y=e2y*VIEW_KY-e2z*VIEW_KZ;
    const uSx=ux*THICK, uSy=(uy*VIEW_KY-uz*VIEW_KZ)*THICK;
    const base=projPt(b.x,b.y,0);
    // 地面投影陰影（落在盆面上，增強立體存在感）
    ctx.setTransform(1,0,0,1,0,0); ctx.save();
    ctx.translate(base[0],base[1]+3); ctx.scale(1,VIEW_KY*0.55);
    ctx.fillStyle='rgba(90,68,42,0.13)'; ctx.beginPath(); ctx.arc(0,0,b.boundR*0.95,0,7); ctx.fill(); ctx.restore();
    const layers=Math.max(4,Math.round(THICK*0.8));
    for(let k=0;k<=layers;k++){const t=k/layers;
      ctx.setTransform(s1x,s1y,s2x,s2y, base[0]+uSx*t, base[1]+uSy*t); ctx.drawImage(b.sideCanvas,-b.cvcx,-b.cvcy);}
    ctx.setTransform(s1x,s1y,s2x,s2y, base[0]+uSx, base[1]+uSy); ctx.drawImage(b.canvas,-b.cvcx,-b.cvcy);
    ctx.setTransform(1,0,0,1,0,0);
  }
  function drawBowl(ctx){
    ctx.save(); ctx.translate(ARENA_CX+SHX,ARENA_CY+SHY); ctx.scale(1,VIEW_KY);
    ctx.strokeStyle='rgba(181,48,42,.09)';ctx.lineWidth=1;
    for(let rr=66;rr<ARENA_R;rr+=66){ctx.beginPath();ctx.arc(0,0,rr,0,7);ctx.stroke();}
    ctx.setLineDash([5,7]);ctx.beginPath();
    ctx.moveTo(0,-ARENA_R);ctx.lineTo(0,ARENA_R);ctx.moveTo(-ARENA_R,0);ctx.lineTo(ARENA_R,0);
    const d=ARENA_R*0.707;ctx.moveTo(-d,-d);ctx.lineTo(d,d);ctx.moveTo(d,-d);ctx.lineTo(-d,d);ctx.stroke();ctx.setLineDash([]);
    ctx.strokeStyle='rgba(181,48,42,.28)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,ARENA_R,0,7);ctx.stroke();
    ctx.restore();
  }
  function drawRiceGrid(ctx){
    ctx.save(); ctx.strokeStyle='rgba(181,48,42,.09)'; ctx.lineWidth=1;
    for(let rr=66;rr<ARENA_R;rr+=66){ctx.beginPath();ctx.arc(ARENA_CX,ARENA_CY,rr,0,7);ctx.stroke();}
    ctx.setLineDash([5,7]); ctx.beginPath();
    ctx.moveTo(ARENA_CX,ARENA_CY-ARENA_R);ctx.lineTo(ARENA_CX,ARENA_CY+ARENA_R);
    ctx.moveTo(ARENA_CX-ARENA_R,ARENA_CY);ctx.lineTo(ARENA_CX+ARENA_R,ARENA_CY);
    const d=ARENA_R*0.707; ctx.moveTo(ARENA_CX-d,ARENA_CY-d);ctx.lineTo(ARENA_CX+d,ARENA_CY+d);
    ctx.moveTo(ARENA_CX+d,ARENA_CY-d);ctx.lineTo(ARENA_CX-d,ARENA_CY+d); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle='rgba(181,48,42,.28)'; ctx.lineWidth=1.5; ctx.beginPath();ctx.arc(ARENA_CX,ARENA_CY,ARENA_R,0,7);ctx.stroke(); ctx.restore();
  }
  function drawTianGrid(ctx,W,H){
    ctx.save(); ctx.strokeStyle='rgba(181,48,42,.4)'; ctx.lineWidth=1.3; ctx.strokeRect(3,3,W-6,H-6);
    ctx.strokeStyle='rgba(181,48,42,.18)'; ctx.lineWidth=1; ctx.setLineDash([4,4]); ctx.beginPath();
    ctx.moveTo(W/2,3);ctx.lineTo(W/2,H-3); ctx.moveTo(3,H/2);ctx.lineTo(W-3,H/2);
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  }
  function drawPreview(canvas,top){
    const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H); drawTianGrid(ctx,W,H);
    if(!top)return; let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const n of top.nodes){mnx=Math.min(mnx,n.lx);mxx=Math.max(mxx,n.lx);mny=Math.min(mny,n.ly);mxy=Math.max(mxy,n.ly);}
    const gw=Math.max(1,mxx-mnx+top.tileDisp),gh=Math.max(1,mxy-mny+top.tileDisp),s=Math.min((W*0.76)/gw,(H*0.76)/gh);
    ctx.save(); ctx.translate(W/2,H/2); ctx.scale(s,s); ctx.translate(-(mnx+mxx)/2,-(mny+mxy)/2);
    paintGlyph(ctx,top,top.nodes.map((_,i)=>i));
    for(const j of top.joints){if(j.kind!=='support')continue;const A=top.nodes[j.a],B=top.nodes[j.b];
      ctx.lineWidth=1.4/s;ctx.strokeStyle='rgba(181,48,42,.55)';ctx.setLineDash([3/s,3/s]);
      ctx.beginPath();ctx.moveTo(A.lx,A.ly);ctx.lineTo(B.lx,B.ly);ctx.stroke();ctx.setLineDash([]);}
    ctx.restore();
  }
  function drawStatusDiagram(canvas,top,nodeBody,main){
    const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height; ctx.clearRect(0,0,W,H); drawTianGrid(ctx,W,H);
    if(!top)return; const half=top.tileDisp/2;
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const n of top.nodes){mnx=Math.min(mnx,n.lx);mxx=Math.max(mxx,n.lx);mny=Math.min(mny,n.ly);mxy=Math.max(mxy,n.ly);}
    const gw=Math.max(1,mxx-mnx+top.tileDisp),gh=Math.max(1,mxy-mny+top.tileDisp),s=Math.min((W*0.76)/gw,(H*0.76)/gh);
    ctx.save(); ctx.translate(W/2,H/2); ctx.scale(s,s); ctx.translate(-(mnx+mxx)/2,-(mny+mxy)/2);
    const att=[];
    for(let i=0;i<top.nodes.length;i++){const n=top.nodes[i];const a=nodeBody?(nodeBody[i]===main):true;
      if(a)att.push(i); else{ctx.fillStyle='rgba(150,140,124,.4)';ctx.fillRect(n.lx-half,n.ly-half,top.tileDisp,top.tileDisp);
        ctx.strokeStyle='rgba(181,48,42,.5)';ctx.lineWidth=1/s;ctx.strokeRect(n.lx-half,n.ly-half,top.tileDisp,top.tileDisp);}}
    paintGlyph(ctx,top,att); ctx.restore();
  }

  /* ---------- 素質列（名人堂用） ---------- */
  const STAT_DEFS=[['weight','重量','#6b6256'],['balance','穩定度','#3f7d4f'],['attack','攻擊力','#b5302a'],['defense','防禦力','#2f6f8f']];
  function renderStats(c,st){c.innerHTML='';for(const [k,l,col] of STAT_DEFS){const v=st[k];const r=document.createElement('div');r.className='stat';
    r.innerHTML=`<span class="lbl">${l}</span><span class="bar"><i style="width:${v}%;background:${col}"></i></span><span class="val">${v}</span>`;c.appendChild(r);}}

  /* =========================================================================
     模式 / 設定畫面
     ========================================================================= */
  let mode='name';
  const MODE_HINT={
    name:'雙方各輸入三個字的名字，每個字化為一顆陀螺。三回合各派一字對決，先得兩勝的名字最強。',
    name4:'雙方各輸入四個字的名字，每個字化為一顆陀螺。四回合各派一字對決，戰績較多勝場的一方獲勝；若兩勝兩敗則平局。',
    single:'雙方各輸入一個字，化為陀螺一對一單挑，分出勝負。'
  };
  function modeNeed(m){ return m==='name4'?4:(m==='name'?3:1); }
  function setMode(m){
    mode=m;
    document.querySelectorAll('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
    document.getElementById('modehint').textContent=MODE_HINT[m];
    const len=modeNeed(m);
    const in1=document.getElementById('in1'), in2=document.getElementById('in2');
    in1.maxLength=len; in2.maxLength=len;
    in1.classList.toggle('len4',m==='name4'); in2.classList.toggle('len4',m==='name4');
    if(m==='single'){ trim1(); }
    refreshPreview(1); refreshPreview(2);
  }
  function trim1(){ for(const id of ['in1','in2']){const el=document.getElementById(id); if([...el.value].length>1)el.value=[...el.value].slice(0,1).join('');}}

  let previews={1:[],2:[]};
  function refreshPreview(which){
    const txt=(document.getElementById(which===1?'in1':'in2').value||'').trim();
    const color=which===1?INK:CINNABAR;
    const row=document.getElementById(which===1?'pvrow1':'pvrow2');
    const chars=[...txt].slice(0,modeNeed(mode));
    row.innerHTML=''; previews[which]=[];
    for(const ch of chars){
      const top=buildTop(ch,color); previews[which].push(top);
      const cell=document.createElement('div'); cell.className='pvcell';
      const cv=document.createElement('canvas'); cv.width=84; cv.height=84; cell.appendChild(cv);
      const cap=document.createElement('div'); cap.className='cap';
      if(top){ drawPreview(cv,top); const s=top.stats;
        cap.innerHTML=`${ch}<br>重${s.weight} 穩${s.balance}<br>攻${s.attack} 防${s.defense}`; }
      else cap.textContent=ch;
      cell.appendChild(cap); row.appendChild(cell);
    }
    updateStartBtn();
  }
  function updateStartBtn(){
    const need=modeNeed(mode);
    const ok=previews[1].length>=need&&previews[2].length>=need&&previews[1].every(Boolean)&&previews[2].every(Boolean);
    document.getElementById('startBtn').disabled=!ok;
  }

  /* =========================================================================
     對戰流程（回合制）
     ========================================================================= */

  function startMatch(){
    const n1=(document.getElementById('in1').value||'').trim(), n2=(document.getElementById('in2').value||'').trim();
    const need=modeNeed(mode);
    const c1=[...n1].slice(0,need), c2=[...n2].slice(0,need);
    const rounds=need, needWins=need===1?1:Math.floor(need/2)+1;
    match={mode,names:[n1,n2],chars:[c1,c2],rounds,round:0,score:[0,0],results:[],needWins};
    document.getElementById('setup').classList.add('hide');
    document.getElementById('battle').classList.add('show');
    document.getElementById('tn1').textContent=mode==='single'?'玩家一':(n1||'玩家一');
    document.getElementById('tn2').textContent=mode==='single'?'玩家二':(n2||'玩家二');
    c1.forEach(c=>recordEntry(buildTop(c,INK))); c2.forEach(c=>recordEntry(buildTop(c,CINNABAR)));
    startRound();
  }
  function startRound(){
    const i=match.round;
    const topA=buildTop(match.chars[0][Math.min(i,match.chars[0].length-1)],INK);
    const topB=buildTop(match.chars[1][Math.min(i,match.chars[1].length-1)],CINNABAR);
    const R0=96;
    const A=makeBody(topA,topA.nodes.map((_,k)=>k),0,true), B=makeBody(topB,topB.nodes.map((_,k)=>k),0,true);
    A.x=ARENA_CX-R0; A.y=ARENA_CY+rnd(-12,12); B.x=ARENA_CX+R0; B.y=ARENA_CY+rnd(-12,12);
    A.vy=1.5; B.vy=1.5; A.av=topA.stats.spin0*1.5*(Math.random()<.5?1:-1); B.av=topB.stats.spin0*1.5*(Math.random()<.5?1:-1);
    game={topA,topB,bodiesA:[A],bodiesB:[B],fx:[],shake:0,over:false,ended:false,winnerSide:null,lastA:topA.origMass,lastB:topB.origMass};
    GAMEREF=game;
    document.getElementById('name1').textContent=topA.text;
    document.getElementById('name2').textContent=topB.text;
    document.getElementById('verdict').textContent='';
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('log').innerHTML='';
    updateScorebar(); renderTeams();
    logMsg(`第 ${match.round+1} 回合：「${topA.text}」對「${topB.text}」！`);
    loop();
  }
  function renderTeams(){
    if(!match)return;
    for(const side of [1,2]){
      const el=document.getElementById('team'+side); if(!el)continue;
      const chars=match.chars[side-1]; let html='';
      for(let i=0;i<chars.length;i++){
        const w=match.results[i]; let res,cls,row='';
        if(w==='A'||w==='B'){ const won=(side===1&&w==='A')||(side===2&&w==='B'); res=won?'勝':'敗'; cls=won?'win':'lose'; row='done'; }
        else if(i===match.round){ res='戰鬥中'; cls='cur'; row='cur'; }
        else { res='待戰'; cls='pend'; }
        html+=`<div class="trow ${row}"><span class="tc">${chars[i]}</span><span class="res ${cls}">${res}</span></div>`;
      }
      el.innerHTML=html;
    }
  }
  function updateScorebar(){
    const sb=document.getElementById('scorebar');
    if(match.mode==='single'){ sb.innerHTML=`<span class="nm p1">${match.chars[0][0]}</span><span class="rd">單字對戰</span><span class="nm p2">${match.chars[1][0]}</span>`; return; }
    let pips=''; for(let i=0;i<match.rounds;i++){const w=match.results[i];
      pips+=`<span class="pip ${w==='A'?'w1':w==='B'?'w2':''}"></span>`;}
    sb.innerHTML=`<span class="nm p1">${match.names[0]}</span><span class="rd">${pips}　第 ${Math.min(match.round+1,match.rounds)}/${match.rounds} 回　</span><span class="nm p2">${match.names[1]}</span>`;
  }
  function logMsg(s){const log=document.getElementById('log');if(!log)return;const d=document.createElement('div');d.textContent='• '+s;log.appendChild(d);log.scrollTop=log.scrollHeight;}

  function centralBody(list,cn){for(const b of list)if(b.nodeIdxs.indexOf(cn)>=0)return b;let x=list[0];for(const b of list)if(b.m>x.m)x=b;return x;}

  function loop(){
    if(!game)return; const {topA,topB}=game;
    for(let s=0;s<SUBSTEPS;s++){
      for(const b of game.bodiesA)stepBody(b); for(const b of game.bodiesB)stepBody(b);
      const sA={},sB={};
      for(const a of game.bodiesA)for(const b of game.bodiesB)collidePair(a,b,game.fx,sA,sB);
      game.bodiesA=applyFracture(topA,game.bodiesA,sA,game.fx);
      game.bodiesB=applyFracture(topB,game.bodiesB,sB,game.fx);
    }
    const cA=centralBody(game.bodiesA,topA.centerNode), cB=centralBody(game.bodiesB,topB.centerNode);
    if(cA.m<game.lastA-0.5)logMsg(`「${topA.text}」筆畫被撞斷轉飛！`);
    if(cB.m<game.lastB-0.5)logMsg(`「${topB.text}」筆畫被撞斷轉飛！`);
    game.lastA=cA.m; game.lastB=cB.m;
    if(!game.over) judge(cA,cB);
    render(); updateSidePanels(cA,cB);
    if(game.over&&!game.ended){game.ended=true; setTimeout(endRound,1300);}
    game.raf=requestAnimationFrame(loop);
  }
  function judge(cA,cB){
    const {topA,topB}=game;
    const aLost=cA.m<topA.origMass*0.5,bLost=cB.m<topB.origMass*0.5,aStop=Math.abs(cA.av)<AV_DEAD,bStop=Math.abs(cB.av)<AV_DEAD;
    const aDead=aLost||aStop,bDead=bLost||bStop;
    if(!(aDead||bDead))return; game.over=true;
    let win; if(aDead&&bDead){ if(aLost&&!bLost)win='B'; else if(bLost&&!aLost)win='A';
    else{const ra=cA.m/topA.origMass,rb=cB.m/topB.origMass; win=(ra!==rb)?(ra>rb?'A':'B'):(Math.abs(cA.av)>=Math.abs(cB.av)?'A':'B');}}
    else win=aDead?'B':'A';
    game.winnerSide=win;
    const wtext=win==='A'?topA.text:topB.text, lose=win==='A'?{l:bLost,t:topB.text}:{l:aLost,t:topA.text};
    const reason=lose.l?'筆畫潰散逾半':'中心旋轉力耗盡';
    const v=document.getElementById('verdict'); v.style.color=win==='A'?topA.color:topB.color; v.textContent=`本回合勝　${wtext}`;
    logMsg(`「${lose.t}」${reason}，「${wtext}」勝出本回合！`);
    recordResult(wtext,true); recordResult(lose.t,false);
  }
  function endRound(){
    if(game&&game.raf)cancelAnimationFrame(game.raf);
    const w=game.winnerSide; match.score[w==='A'?0:1]++; match.results[match.round]=w; updateScorebar(); renderTeams();
    // 所有回合打完（single 模式只一回合）才定勝負
    if(match.round>=match.rounds-1) showFinal(); else showRoundResult(w);
  }
  function showRoundResult(w){
    const ov=document.getElementById('overlay');
    const wt=w==='A'?game.topA.text:game.topB.text, col=w==='A'?INK:CINNABAR;
    ov.innerHTML=`<div class="big" style="color:${col}">本回合 ${wt} 勝</div>
      <div class="small">目前比數　${match.names[0]} ${match.score[0]} - ${match.score[1]} ${match.names[1]}</div>
      <button class="ctrlbtn primary" id="nextRound">下一回合 ▶</button>`;
    ov.classList.add('show');
    document.getElementById('nextRound').onclick=()=>{ if(game&&game.raf)cancelAnimationFrame(game.raf); match.round++; startRound(); };
  }
  function showFinal(){
    if(game&&game.raf)cancelAnimationFrame(game.raf);
    const ov=document.getElementById('overlay');
    let msg,col;
    if(match.mode==='single'){ const w=match.results[0]==='A'?0:1;
      col=w===0?INK:CINNABAR; msg=`勝者　${match.chars[w][0]}`; }
    else if(match.score[0]===match.score[1]){
      col=INK; msg=`雙方平手<br><span style="font-size:30px">${match.names[0]} ${match.score[0]} - ${match.score[1]} ${match.names[1]}</span>`; }
    else{ const w=match.score[0]>match.score[1]?0:1; col=w===0?INK:CINNABAR;
      msg=`最強的名字<br><span style="font-size:40px">${match.names[w]}</span>`; }
    ov.innerHTML=`<div class="big" style="color:${col}">${msg}</div>
      <div class="small">${match.mode!=='single'?`最終比數　${match.names[0]} ${match.score[0]} - ${match.score[1]} ${match.names[1]}`:''}</div>
      <button class="ctrlbtn primary" id="againBtn">再來一場</button>`;
    ov.classList.add('show');
    document.getElementById('againBtn').onclick=()=>{ match.round=0;match.score=[0,0];match.results=[]; startRound(); };
  }

  function render(){
    const ctx=document.getElementById('arena').getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,520,520);
    SHX=0; SHY=0;
    if(game.shake>0.3){SHX=(Math.random()-0.5)*game.shake;SHY=(Math.random()-0.5)*game.shake;game.shake*=0.86;}else game.shake=0;
    drawBowl(ctx);
    const all=game.bodiesA.concat(game.bodiesB).sort((p,q)=>p.y-q.y); // 由遠到近（畫家排序）
    for(const b of all) drawBody3D(ctx,b);
    ctx.setTransform(1,0,0,1,0,0);
    for(let i=game.fx.length-1;i>=0;i--){const e=game.fx[i]; e.life-=e.decay; if(e.life<=0){game.fx.splice(i,1);continue;}
      if(e.t==='r'){const rr=lerp(e.r0,e.r1,1-e.life),p=projPt(e.x,e.y,0);
        ctx.save();ctx.translate(p[0],p[1]);ctx.scale(1,VIEW_KY);ctx.strokeStyle=hexA(e.c,e.life*0.7);ctx.lineWidth=2*e.life+0.4;ctx.beginPath();ctx.arc(0,0,rr,0,7);ctx.stroke();ctx.restore();}
      else{e.x+=e.vx;e.y+=e.vy;e.vx*=0.93;e.vy*=0.93;const p=projPt(e.x,e.y,0);ctx.fillStyle=hexA(e.c,e.life);ctx.beginPath();ctx.arc(p[0],p[1],e.r*e.life+0.4,0,7);ctx.fill();}}
  }
  function nodeBodyMap(top,bodies){const m={};for(const b of bodies)for(const i of b.nodeIdxs)m[i]=b;return m;}
  function updateSidePanels(cA,cB){
    const {topA,topB}=game;
    drawStatusDiagram(document.getElementById('sd1'),topA,nodeBodyMap(topA,game.bodiesA),cA);
    drawStatusDiagram(document.getElementById('sd2'),topB,nodeBodyMap(topB,game.bodiesB),cB);
    document.getElementById('ig1').textContent=Math.round(cA.m/topA.origMass*100);
    document.getElementById('ig2').textContent=Math.round(cB.m/topB.origMass*100);
  }

  /* ---------- 名人堂 ---------- */
  let HALL_MEM={};
  function loadHall(){return HALL_MEM;}
  function saveHall(h){HALL_MEM=h;}
  function recordEntry(top){if(!top)return;const h=loadHall(),k=top.text;
    if(!h[k])h[k]={text:top.text,stats:{weight:top.stats.weight,balance:top.stats.balance,attack:top.stats.attack,defense:top.stats.defense,durability:top.stats.durability},fragCount:top.comp,plays:0,wins:0,losses:0,first:Date.now()};
    saveHall(h);}
  function recordResult(t,win){const h=loadHall();if(!h[t])return;h[t].plays=(h[t].plays||0)+1;if(win)h[t].wins=(h[t].wins||0)+1;else h[t].losses=(h[t].losses||0)+1;saveHall(h);}
  function openHall(){
    document.getElementById('hallView').style.display=''; document.getElementById('hallDetail').style.display='none';
    const h=loadHall(),keys=Object.keys(h).sort((a,b)=>(h[b].plays||0)-(h[a].plays||0)||h[b].first-h[a].first),grid=document.getElementById('hallGrid');
    if(!keys.length)grid.innerHTML='<div class="empty">還沒有任何文字陀螺上場過。</div>';
    else{grid.innerHTML=''; for(const k of keys){const e=h[k];const c=document.createElement('div');c.className='hallcard';
      c.innerHTML=`<div class="gly">${e.text}</div><div class="meta">攻${e.stats.attack}・防${e.stats.defense}・穩${e.stats.balance}<br>${e.plays||0}戰 <span style="color:var(--ok)">${e.wins||0}勝</span> <span style="color:var(--red)">${e.losses||0}敗</span></div>`;
      c.onclick=()=>showHallDetail(k); grid.appendChild(c);}}
    document.getElementById('hallModal').classList.add('show');
  }
  function showHallDetail(key){const h=loadHall(),e=h[key];if(!e)return;
    document.getElementById('hallView').style.display='none'; const d=document.getElementById('hallDetail'); d.style.display=''; d.innerHTML='';
    const back=document.createElement('button');back.className='backlink';back.textContent='← 返回列表';back.onclick=openHall;d.appendChild(back);
    const box=document.createElement('div');box.className='detail';box.innerHTML=`<div class="bigly">${e.text}</div><div class="dstats" id="dst"></div>`;d.appendChild(box);
    renderStats(box.querySelector('#dst'),e.stats);
    const info=document.createElement('div');info.className='msub';const wr=e.plays?Math.round(e.wins/e.plays*100):0;
    info.innerHTML=`筆畫分離 ${e.fragCount} 段　｜　出戰 ${e.plays||0} 場　勝率 ${wr}%（${e.wins||0}勝 ${e.losses||0}敗）`;d.appendChild(info);}

  /* ---------- 事件 ---------- */
  document.querySelectorAll('.modebtn').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  document.getElementById('in1').addEventListener('input',()=>refreshPreview(1));
  document.getElementById('in2').addEventListener('input',()=>refreshPreview(2));
  document.getElementById('startBtn').addEventListener('click',startMatch);
  document.getElementById('rematch').addEventListener('click',()=>{ if(game&&game.raf)cancelAnimationFrame(game.raf); if(match){match.round=0;match.score=[0,0];match.results=[];startRound();} });
  document.getElementById('backSetup').addEventListener('click',()=>{ if(game&&game.raf)cancelAnimationFrame(game.raf); game=null;GAMEREF=null;
    document.getElementById('battle').classList.remove('show'); document.getElementById('setup').classList.remove('hide'); refreshPreview(1);refreshPreview(2); });
  document.getElementById('openHall').addEventListener('click',openHall);
  document.getElementById('closeHall').addEventListener('click',()=>document.getElementById('hallModal').classList.remove('show'));
  document.getElementById('hallModal').addEventListener('click',e=>{if(e.target.id==='hallModal')document.getElementById('hallModal').classList.remove('show');});
  document.getElementById('clearHall').addEventListener('click',()=>{if(confirm('確定清除所有上場紀錄？')){HALL_MEM={};openHall();}});

  function init(){ setMode('name'); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{refreshPreview(1);refreshPreview(2);}); }
  init();
})

onUnmounted(() => {
  if (game && game.raf) cancelAnimationFrame(game.raf)
})
</script>

<style scoped>
.spin-battle-app{
  --bg:#f5efe3; --panel:#fcf9f2; --line:#e0d4bd; --txt:#241f18; --dim:#9c8f76;
  --ink:#1c1a17; --red:#b5302a; --redline:rgba(181,48,42,.32); --grid:rgba(181,48,42,.08);
  --ok:#3f7d4f;
  --kai:"BiauKai","DFKai-SB","TW-Kai","KaiTi TC","Kaiti TC","STKaiti","Kaiti SC","Noto Serif TC",serif;
  display:block;
  margin:0;padding:0;
  background:var(--bg);color:var(--txt);
  font-family:"Noto Serif TC","Songti TC",-apple-system,"PingFang TC",serif;
  min-height:100vh;
  background-image:repeating-linear-gradient(0deg,var(--grid) 0 1px,transparent 1px 42px),
  repeating-linear-gradient(90deg,var(--grid) 0 1px,transparent 1px 42px);
}
.spin-battle-app *{box-sizing:border-box}
.wrap{max-width:1080px;margin:0 auto;padding:22px 18px 60px}
header.top{display:flex;align-items:center;gap:14px;margin-bottom:16px}
header.top h1{font-size:28px;letter-spacing:6px;font-family:var(--kai);margin:0;
  color:var(--ink);border-left:5px solid var(--red);padding-left:12px}
.hallbtn{margin-left:auto;background:none;border:1px solid var(--line);color:var(--dim);
  padding:7px 13px;border-radius:7px;cursor:pointer;font-size:13px;transition:.15s}
.hallbtn:hover{border-color:var(--red);color:var(--red)}

/* 模式切換 */
.modes{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.modebtn{flex:0 0 auto;background:none;border:1px solid var(--line);color:var(--dim);
  padding:9px 18px;border-radius:8px;cursor:pointer;font-size:14px;letter-spacing:1px;transition:.15s;font-family:var(--kai)}
.modebtn.active{background:var(--red);color:#fff8f0;border-color:var(--red)}
.hint{color:var(--dim);font-size:12.5px;margin:0 0 16px;line-height:1.7}

/* 設定 */
#setup .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pcard{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}
.pcard h3{font-size:14px;letter-spacing:1px;margin:0 0 10px;display:flex;align-items:center;gap:8px;color:var(--dim)}
.dot{width:9px;height:9px;border-radius:50%}
.dot.p1{background:var(--ink)} .dot.p2{background:var(--red)}
.nameinput{width:100%;background:#fffdf7;border:1px solid var(--redline);color:var(--txt);font-family:var(--kai);
  font-size:28px;padding:9px 12px;border-radius:7px;text-align:center;letter-spacing:10px}
.nameinput.len4{font-size:23px;letter-spacing:5px}
.nameinput:focus{outline:none;border-color:var(--red)}
.pvrow{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:center}
.pvcell{text-align:center}
.pvcell canvas{background:#fffdf7;border:1px solid var(--redline);border-radius:7px;display:block}
.pvcell .cap{font-size:10.5px;color:var(--dim);margin-top:4px;line-height:1.4}
.startrow{display:flex;justify-content:center;margin-top:22px}
.startbtn{background:var(--red);color:#fff8f0;border:none;font-family:var(--kai);
  font-size:21px;font-weight:700;letter-spacing:10px;padding:13px 50px;border-radius:8px;cursor:pointer;transition:.15s}
.startbtn:hover{transform:translateY(-1px)}
.startbtn:disabled{opacity:.4;cursor:not-allowed;transform:none}

/* 戰鬥 */
#battle{display:none} #battle.show{display:block} #setup.hide{display:none}
.scorebar{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:12px;
  font-family:var(--kai);font-size:17px;letter-spacing:2px}
.scorebar .nm{font-size:22px}
.scorebar .nm.p1{color:var(--ink)} .scorebar .nm.p2{color:var(--red)}
.scorebar .pip{display:inline-block;width:11px;height:11px;border-radius:50%;border:1.5px solid var(--dim);margin:0 2px;vertical-align:middle}
.scorebar .pip.w1{background:var(--ink);border-color:var(--ink)}
.scorebar .pip.w2{background:var(--red);border-color:var(--red)}
.scorebar .rd{color:var(--dim);font-size:13px;letter-spacing:1px}
.arena-layout{display:grid;grid-template-columns:210px 1fr 210px;gap:16px;align-items:start}
.side{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center}
.teamname{font-family:var(--kai);font-size:18px;letter-spacing:3px;margin-bottom:9px}
.side.p1 .teamname{color:var(--ink)} .side.p2 .teamname{color:var(--red)}
.team{display:flex;flex-direction:column;gap:6px;margin-bottom:10px}
.trow{display:flex;align-items:center;gap:8px;padding:5px 9px;border:1px solid var(--line);border-radius:7px;background:#fffdf7;opacity:.55;transition:.15s}
.trow.cur{opacity:1;border-color:var(--red);box-shadow:inset 0 0 0 1px var(--red)}
.trow.done{opacity:1}
.trow .tc{font-family:var(--kai);font-size:24px;width:26px;text-align:center}
.side.p1 .trow .tc{color:var(--ink)} .side.p2 .trow .tc{color:var(--red)}
.trow .res{margin-left:auto;font-size:12.5px;font-family:var(--kai);letter-spacing:1px}
.res.win{color:var(--ok)} .res.lose{color:#b9b1a4} .res.cur{color:var(--red)} .res.pend{color:#c9bda3}
.curch{font-family:var(--kai)}
.statusdiagram{display:block;margin:4px auto 8px;background:#fffdf7;border:1px solid var(--redline);border-radius:7px}
.integrity{font-size:12px;color:var(--dim)} .integrity b{font-size:17px;font-variant-numeric:tabular-nums;color:var(--txt)}
.arena-center{display:flex;flex-direction:column;align-items:center}
#arena{background:radial-gradient(circle at 50% 46%,#ffffff 0%,#fdfaf3 60%,#f0e7d6 100%);
  border-radius:50%;box-shadow:inset 0 6px 22px rgba(120,90,55,.10),0 0 0 6px #fcf9f2,0 0 0 7px var(--redline)}
.verdict{min-height:24px;margin-top:10px;text-align:center;font-size:22px;letter-spacing:5px;font-weight:700;font-family:var(--kai)}
.controls{display:flex;gap:10px;margin-top:12px;justify-content:center;flex-wrap:wrap}
.ctrlbtn{background:none;border:1px solid var(--line);color:var(--txt);padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-family:var(--kai);letter-spacing:1px;transition:.15s}
.ctrlbtn:hover{border-color:var(--red);color:var(--red)}
.ctrlbtn.primary{background:var(--red);color:#fff8f0;border-color:var(--red)}
.ctrlbtn.primary:hover{color:#fff8f0}
.battlelog{margin-top:10px;background:#fffdf7;border:1px solid var(--redline);border-radius:7px;
  height:74px;overflow-y:auto;padding:7px 12px;font-size:12.5px;color:#5a544a;line-height:1.7}

/* 名人堂 */
.modal{position:fixed;inset:0;background:rgba(20,12,8,.7);display:none;align-items:flex-start;justify-content:center;z-index:50;padding:40px 16px;overflow-y:auto}
.modal.show{display:flex}
.modalbox{background:var(--panel);border:1px solid var(--line);border-radius:14px;max-width:840px;width:100%;padding:22px}
.modalbox h2{font-size:18px;letter-spacing:2px;margin:0 0 4px;font-family:var(--kai)}
.modalbox .msub{color:var(--dim);font-size:12px;margin-bottom:16px}
.closex{float:right;background:none;border:none;color:var(--dim);font-size:22px;cursor:pointer;line-height:1}
.hallgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
.hallcard{background:#fffdf7;border:1px solid var(--line);border-radius:10px;padding:12px;cursor:pointer;transition:.15s;text-align:center}
.hallcard:hover{border-color:var(--red);transform:translateY(-2px)}
.hallcard .gly{font-size:38px;font-family:var(--kai);margin:2px 0 5px}
.hallcard .meta{font-size:10.5px;color:var(--dim);line-height:1.5}
.empty{color:var(--dim);font-size:13px;padding:30px;text-align:center}
.clearhall{margin-top:16px;background:none;border:1px solid var(--line);color:var(--dim);padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px}
.stat{display:grid;grid-template-columns:54px 1fr 34px;align-items:center;gap:8px;font-size:12px;margin-bottom:5px}
.stat .lbl{color:var(--dim)} .bar{height:7px;background:var(--bg);border-radius:6px;overflow:hidden;border:1px solid var(--line)}
.bar>i{display:block;height:100%} .stat .val{text-align:right;font-variant-numeric:tabular-nums}
.detail{display:flex;gap:18px;flex-wrap:wrap;align-items:center;background:#fffdf7;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:14px}
.detail .bigly{font-size:64px;font-family:var(--kai);color:var(--ink);min-width:88px;text-align:center}
.detail .dstats{flex:1;min-width:220px}
.backlink{background:none;border:none;color:var(--red);cursor:pointer;font-size:13px;margin-bottom:10px}

/* 結果浮層 */
.overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;
  background:rgba(252,249,242,.82);border-radius:50%;text-align:center}
.overlay.show{display:flex}
.overlay .big{font-family:var(--kai);font-size:30px;letter-spacing:3px;margin-bottom:6px}
.overlay .small{color:var(--dim);font-size:13px;margin-bottom:16px}
.arena-wrap{position:relative;width:520px;height:520px}
@media(max-width:900px){.arena-layout{grid-template-columns:1fr}#setup .grid{grid-template-columns:1fr}.arena-wrap{width:100%;height:auto}}
</style>
'use client';
import { useState } from 'react';
import TabManager from '@/components/manager/TabManager';
const INIT = { username:'BioHacker_Alpha', class:'Flow Architect', avatar:'', managerConfig:{ finance:{
  transactions:[
    {id:'t1',amount:8400,type:'income',category:'Freelance',date:'2026-06-02',description:'Client Retainer'},
    {id:'t2',amount:240,type:'expense',category:'Health/Bio',date:'2026-06-18',description:'Bio-Stack Refill'},
    {id:'t3',amount:49,type:'expense',category:'Abonnements',date:'2026-05-16',description:'Cloud Sync'},
    {id:'t4',amount:49,type:'expense',category:'Abonnements',date:'2026-06-16',description:'Cloud Sync'},
  ],
  customAssets:[{id:'a1',name:'Neural-Link Upgrade',value:240000,roi:'+15.2%',category:'Biological'},{id:'a2',name:'Stem Cell Pool',value:115000,roi:'1.4x',category:'Biological'}],
  customLiabilities:[{id:'l1',name:'Cloud Tier IV',value:499,type:'Subscription'}],
  customGoals:[{id:'g1',name:'Notgroschen',target:10000,current:4200}],
  buyInterest:[{id:'b1',title:'Cortical Interface v5.0',price:1450000,notes:'Neural-to-cloud expansion'}],
}}};
export default function P(){const[p,setP]=useState(INIT);return(
  <div style={{display:'grid',gridTemplateColumns:'220px 1fr',height:'100vh',background:'#060509'}}>
    <div style={{borderRight:'1px solid rgba(255,255,255,0.08)'}} />
    <div style={{overflowY:'auto'}}>
      <div style={{maxWidth:1360,margin:'0 auto',padding:'1.75rem 2.5rem',display:'flex',flexDirection:'column'}}>
        <TabManager profile={p} saveProfile={(x)=>setP(v=>({...v,...x}))} />
      </div>
    </div>
  </div>);}

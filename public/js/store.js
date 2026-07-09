const S={
  g(k,d=null){try{const v=localStorage.getItem('kc_'+k);return v?JSON.parse(v):d}catch{return d}},
  s(k,v){localStorage.setItem('kc_'+k,JSON.stringify(v))},
  key(p){return this.g(`key_${p}`,'')},
  setKey(p,v){this.s(`key_${p}`,v)},
  prov(){return this.g('prov','openrouter')},
  setProv(v){this.s('prov',v)},
  model(){return this.g('model','deepseek/deepseek-chat-v3-0324:free')},
  setModel(v){this.s('model',v)},
  proj(){return this.g('proj','')},
  setProj(v){this.s('proj',v)},
  ghToken(){return this.g('ght','')},
  setGhToken(v){this.s('ght',v)},
  theme(){return this.g('theme','dark')},
  setTheme(v){this.s('theme',v);document.documentElement.setAttribute('data-theme',v)},
};
document.documentElement.setAttribute('data-theme',S.theme());
window.S=S;

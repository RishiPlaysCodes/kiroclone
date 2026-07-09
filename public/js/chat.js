class ChatManager {
  constructor(){this.messages=[];this.isLoading=false;this.init();}
  init(){this.messagesEl=document.getElementById('chat-messages');this.inputEl=document.getElementById('chat-input');this.sendBtn=document.getElementById('send-btn');this.bindEvents();}
  bindEvents(){
    this.sendBtn.addEventListener('click',()=>this.sendMessage());
    this.inputEl.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.sendMessage();}});
    this.inputEl.addEventListener('input',()=>{this.inputEl.style.height='auto';this.inputEl.style.height=Math.min(this.inputEl.scrollHeight,120)+'px';});
    document.querySelectorAll('.hint').forEach(h=>h.addEventListener('click',()=>{this.inputEl.value=h.dataset.prompt;this.inputEl.focus();}));
    document.getElementById('clear-chat')?.addEventListener('click',()=>this.clearChat());
  }
  async sendMessage(){
    const content=this.inputEl.value.trim();if(!content||this.isLoading)return;
    this.addMessage('user',content);this.inputEl.value='';this.inputEl.style.height='auto';
    this.isLoading=true;this.sendBtn.disabled=true;const loadingEl=this.showLoading();
    try{
      const context={};if(window.editor?.currentFile){context.currentFile=window.editor.currentFile;context.currentCode=document.getElementById('code-editor')?.value||'';}
      const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[...this.messages,{role:'user',content}],context})});
      const d=await r.json();loadingEl.remove();
      if(d.response){this.addMessage('assistant',d.response);this.messages.push({role:'user',content},{role:'assistant',content:d.response});}
    }catch(e){loadingEl.remove();this.addMessage('assistant','Sorry, I encountered an error. Please try again.');}
    finally{this.isLoading=false;this.sendBtn.disabled=false;}
  }
  addMessage(role,content){
    const el=document.createElement('div');el.className=`message ${role}`;
    const avatar=role==='user'?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#6366f1"/><path d="M2 12l10 5 10-5" stroke="#818cf8" stroke-width="2" fill="none"/></svg>';
    el.innerHTML=`<div class="message-avatar">${avatar}</div><div class="message-content">${this.renderMarkdown(content)}</div>`;
    this.messagesEl.appendChild(el);this.scrollToBottom();
  }
  renderMarkdown(text){
    let h=text;
    h=h.replace(/```(\w*)\n([\s\S]*?)```/g,(m,lang,code)=>{const e=this.esc(code.trim());return `<div class="code-block"><div class="code-header"><span>${lang||'code'}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('.code-body').textContent)">Copy</button></div><div class="code-body">${e}</div></div>`;});
    h=h.replace(/`([^`]+)`/g,'<code style="background:var(--bg-tertiary);padding:0.1rem 0.3rem;border-radius:3px;font-family:var(--font-mono);font-size:0.8em;">$1</code>');
    h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');
    h=h.replace(/^## (.+)$/gm,'<h3 style="margin:0.75rem 0 0.5rem;font-size:1rem;">$1</h3>');
    h=h.replace(/^- (.+)$/gm,'<li>$1</li>');
    h=h.replace(/(<li>.*<\/li>\n?)+/g,'<ul>$&</ul>');
    h=h.replace(/^\d+\. (.+)$/gm,'<li>$1</li>');
    h=h.replace(/\n\n/g,'</p><p>');h='<p>'+h+'</p>';h=h.replace(/<p><\/p>/g,'');
    h=h.replace(/\n/g,'<br>');h=h.replace(/<br><ul>/g,'<ul>');h=h.replace(/<\/ul><br>/g,'</ul>');
    h=h.replace(/<br><div/g,'<div');h=h.replace(/<\/div><br>/g,'</div>');
    return h;
  }
  esc(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
  showLoading(){const el=document.createElement('div');el.className='message assistant';el.innerHTML=`<div class="message-avatar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#6366f1"/><path d="M2 12l10 5 10-5" stroke="#818cf8" stroke-width="2" fill="none"/></svg></div><div class="message-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;this.messagesEl.appendChild(el);this.scrollToBottom();return el;}
  scrollToBottom(){this.messagesEl.scrollTop=this.messagesEl.scrollHeight;}
  clearChat(){this.messages=[];this.messagesEl.innerHTML='';this.addMessage('assistant','Chat cleared! How can I help you?');}
}
window.chat=new ChatManager();

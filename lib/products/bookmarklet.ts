export function meogeodoListingBookmarklet(origin: string): string {
  return `javascript:(function(){var o=${JSON.stringify(origin)};var p={type:'meogeodo-listing',payload:{url:location.href,title:document.title,text:(document.body&&document.body.innerText||'').slice(0,35000)}};var w=window.open(o+'/app/check?go=1&from=page','_blank');var n=0;var t=setInterval(function(){n++;try{w.postMessage(p,o)}catch(e){}if(n>25)clearInterval(t)},250)})();`;
}

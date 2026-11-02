function p(c,s,r){const n=e=>`"${(e==null?"":String(e)).replace(/"/g,'""')}"`,a=[s.map(n).join(","),...r.map(e=>e.map(n).join(","))],l=new Blob([a.join(`
`)],{type:"text/csv;charset=utf-8;"}),o=URL.createObjectURL(l),t=document.createElement("a");t.href=o,t.download=c,t.click(),URL.revokeObjectURL(o)}export{p as d};

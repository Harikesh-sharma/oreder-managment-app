const PRODUCTS = [
  {id:1,name:"Classic Product",price:799,icon:"◈",desc:"A clean sample product for the ordering MVP."},
  {id:2,name:"Premium Product",price:1299,icon:"◆",desc:"Higher-value sample product with a premium position."},
  {id:3,name:"Signature Product",price:1699,icon:"✦",desc:"Signature sample item for testing multi-item orders."},
  {id:4,name:"Gift Product",price:599,icon:"◇",desc:"Small sample item suitable for add-on purchases."},
  {id:5,name:"Limited Product",price:999,icon:"⬟",desc:"Limited sample product for inventory validation."},
  {id:6,name:"Custom Product",price:2199,icon:"✧",desc:"Sample custom product for larger orders."}
];
const STATUSES = ["NEW","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","CANCELLED"];
let cart = JSON.parse(localStorage.getItem("orderflow_cart") || "[]");
let orders = JSON.parse(localStorage.getItem("orderflow_orders") || "[]");

const money = n => "₹" + Number(n).toLocaleString("en-IN");
function save(){localStorage.setItem("orderflow_cart",JSON.stringify(cart));localStorage.setItem("orderflow_orders",JSON.stringify(orders));}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2600);}
function renderProducts(list=PRODUCTS){
  const q=document.getElementById("search").value.trim().toLowerCase();
  const data=list.filter(p=>p.name.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q));
  document.getElementById("productGrid").innerHTML=data.map(p=>`
    <article class="product-card">
      <div class="product-image">${p.icon}</div>
      <div class="product-body">
        <h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.desc)}</p>
        <div class="price-row"><span class="price">${money(p.price)}</span><button class="add-btn" onclick="addToCart(${p.id})">Add to cart</button></div>
      </div>
    </article>`).join("") || `<div class="panel">No products found.</div>`;
}
function addToCart(id){const p=PRODUCTS.find(x=>x.id===id);const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});save();renderCart();toast(`${p.name} added to cart`);}
function updateQty(id,delta){const item=cart.find(x=>x.id===id);if(!item)return;item.qty+=delta;if(item.qty<=0)cart=cart.filter(x=>x.id!==id);save();renderCart();}
function cartData(){return cart.map(i=>({...PRODUCTS.find(p=>p.id===i.id),qty:i.qty}));}
function cartTotal(){return cartData().reduce((s,i)=>s+i.price*i.qty,0);}
function renderCart(){
  const data=cartData(), count=cart.reduce((s,i)=>s+i.qty,0);
  document.getElementById("cartCount").textContent=count;
  document.getElementById("cartTotal").textContent=money(cartTotal());
  document.getElementById("cartItems").innerHTML=data.length?data.map(i=>`
    <div class="cart-item"><div><strong>${escapeHtml(i.name)}</strong><div class="muted">${money(i.price)} × ${i.qty}</div></div>
    <div class="qty-controls"><button onclick="updateQty(${i.id},-1)">−</button><span>${i.qty}</span><button onclick="updateQty(${i.id},1)">+</button></div></div>`).join(""):`<p class="muted">Your cart is empty.</p>`;
}
function openModal(id){const m=document.getElementById(id);m.classList.remove("hidden");m.setAttribute("aria-hidden","false")}
function closeModal(id){const m=document.getElementById(id);m.classList.add("hidden");m.setAttribute("aria-hidden","true")}
function validateCheckout(fd){
  const errors=[];
  const name=fd.get("name").trim(),phone=fd.get("phone").trim(),email=fd.get("email").trim(),pin=fd.get("pincode").trim();
  if(name.length<2)errors.push("Enter a valid full name.");
  if(!/^[6-9]\d{9}$/.test(phone))errors.push("Enter a valid 10-digit Indian mobile number.");
  if(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.push("Enter a valid email address.");
  if(!/^\d{6}$/.test(pin))errors.push("Enter a valid 6-digit pincode.");
  if(fd.get("address").trim().length<8)errors.push("Enter a complete delivery address.");
  if(!fd.get("city").trim()||!fd.get("state").trim())errors.push("City and state are required.");
  if(!cart.length)errors.push("Your cart is empty.");
  return errors;
}
function createOrder(fd){
  const items=cartData().map(i=>({productId:i.id,name:i.name,quantity:i.qty,unitPrice:i.price,subtotal:i.price*i.qty}));
  const subtotal=items.reduce((s,i)=>s+i.subtotal,0);
  const delivery=subtotal>=1500?0:50;
  const now=new Date();
  const prefix=`ORD-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const seq=String(orders.length+1).padStart(4,"0");
  return {id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),orderNumber:`${prefix}-${seq}`,customer:{name:fd.get("name").trim(),phone:fd.get("phone").trim(),email:fd.get("email").trim(),address:fd.get("address").trim(),city:fd.get("city").trim(),state:fd.get("state").trim(),pincode:fd.get("pincode").trim()},items,subtotal,delivery,total:subtotal+delivery,paymentMethod:fd.get("paymentMethod"),paymentStatus:"PENDING",status:"NEW",createdAt:now.toISOString()};
}
document.getElementById("search").addEventListener("input",()=>renderProducts());
document.getElementById("openCart").onclick=()=>{renderCart();openModal("cartModal")};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.getElementById("checkoutBtn").onclick=()=>{if(!cart.length)return toast("Add a product first.");closeModal("cartModal");openModal("checkoutModal")};
document.getElementById("checkoutForm").addEventListener("submit",e=>{
  e.preventDefault();const fd=new FormData(e.target),errors=validateCheckout(fd),box=document.getElementById("checkoutError");
  if(errors.length){box.textContent=errors.join(" ");box.classList.remove("hidden");return}
  box.classList.add("hidden");const order=createOrder(fd);orders.unshift(order);cart=[];save();e.target.reset();closeModal("checkoutModal");renderCart();renderOrders();toast(`Order ${order.orderNumber} created successfully`);
  location.hash="admin";
});
function renderOrders(){
  const q=document.getElementById("adminSearch").value.trim().toLowerCase(),filter=document.getElementById("statusFilter").value;
  const data=orders.filter(o=>(filter==="ALL"||o.status===filter)&&(`${o.orderNumber} ${o.customer.name} ${o.customer.phone}`.toLowerCase().includes(q)));
  document.getElementById("ordersTable").innerHTML=data.length?data.map(o=>`
    <tr>
      <td><strong>${escapeHtml(o.orderNumber)}</strong><br><small class="muted">${new Date(o.createdAt).toLocaleString("en-IN")}</small></td>
      <td>${escapeHtml(o.customer.name)}<br><small class="muted">${escapeHtml(o.customer.city)}</small></td>
      <td><strong>${money(o.total)}</strong></td>
      <td>${escapeHtml(o.paymentStatus)}</td>
      <td><span class="status-pill">${escapeHtml(o.status)}</span></td>
      <td><select class="status-select" onchange="changeStatus('${o.id}',this.value)">${STATUSES.map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td>
    </tr>`).join(""):`<tr><td colspan="6" class="muted">No orders yet.</td></tr>`;
}
function changeStatus(id,status){const o=orders.find(x=>x.id===id);if(!o)return;o.status=status;save();renderOrders();toast(`${o.orderNumber} → ${status}`)}
document.getElementById("adminSearch").addEventListener("input",renderOrders);
document.getElementById("statusFilter").addEventListener("change",renderOrders);
document.getElementById("trackBtn").onclick=()=>{
  const id=document.getElementById("trackOrderId").value.trim(),phone=document.getElementById("trackPhone").value.trim(),o=orders.find(x=>x.orderNumber===id&&x.customer.phone===phone),el=document.getElementById("trackResult");
  if(!o){el.innerHTML='<div class="tracking-card" style="color:#c63b45">Order not found. Check the order number and mobile number.</div>';return}
  const active=STATUSES.indexOf(o.status);
  const normal=["NEW","CONFIRMED","PROCESSING","SHIPPED","DELIVERED"];
  el.innerHTML=`<div class="tracking-card"><strong>${escapeHtml(o.orderNumber)}</strong><p>${escapeHtml(o.customer.name)} · ${money(o.total)} · ${escapeHtml(o.status)}</p><div class="steps">${normal.map((s,i)=>`<div class="step ${o.status!=="CANCELLED"&&i<active?"done":""} ${o.status===s?"current":""}">${s}</div>`).join("")}</div></div>`;
};
document.getElementById("seedBtn").onclick=()=>{
  const fake={id:"demo-"+Date.now(),orderNumber:"ORD-DEMO-0001",customer:{name:"Demo Customer",phone:"9876543210",email:"demo@example.com",address:"Demo address",city:"Amritsar",state:"Punjab",pincode:"143001"},items:[{productId:1,name:"Classic Product",quantity:1,unitPrice:799,subtotal:799}],subtotal:799,delivery:50,total:849,paymentMethod:"COD",paymentStatus:"PENDING",status:"NEW",createdAt:new Date().toISOString()};
  orders.unshift(fake);save();renderOrders();toast("Demo order added");
};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
renderProducts();renderCart();renderOrders();

document.querySelector('[data-variant-select]')?.addEventListener('change',event=>{
  const option=event.target.selectedOptions[0];if(!option.dataset.price)return;
  document.querySelector('[data-variant-price]').textContent=option.dataset.price;
  document.querySelector('.product-image-full').src=option.dataset.image;
});
document.querySelector('[data-catalogue-search]')?.addEventListener('submit',event=>{
  event.preventDefault();const query=event.target.querySelector('input[type="search"]').value.trim().toLowerCase();let count=0;
  document.querySelectorAll('[data-product-name]').forEach(card=>{card.hidden=!card.dataset.productName.includes(query);if(!card.hidden)count++;});
  let empty=document.querySelector('.catalogue-search-empty');
  if(!empty){empty=document.createElement('p');empty.className='catalogue-search-empty';empty.setAttribute('role','status');document.querySelector('.product-wrapper').append(empty);}
  empty.textContent=count?'':'No products found.';
});

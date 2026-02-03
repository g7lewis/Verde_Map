import { getUncachableStripeClient } from '../server/stripeClient';

async function createVerdeProSubscription() {
  console.log('Creating Verde Pro subscription product...');
  
  const stripe = await getUncachableStripeClient();
  
  const existingProducts = await stripe.products.search({ 
    query: "name:'Verde Pro'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Verde Pro product already exists:', existingProducts.data[0].id);
    
    const existingPrices = await stripe.prices.list({
      product: existingProducts.data[0].id,
      active: true,
    });
    
    console.log('Existing prices:');
    for (const price of existingPrices.data) {
      console.log(`  - ${price.id}: $${(price.unit_amount || 0) / 100}/${price.recurring?.interval}`);
    }
    return;
  }

  const product = await stripe.products.create({
    name: 'Verde Pro',
    description: 'Unlimited environmental analyses, unlimited community pins, priority support, and exclusive features.',
    metadata: {
      tier: 'pro',
      features: JSON.stringify([
        'Unlimited daily environmental analyses',
        'Unlimited community pins',
        'Priority AI responses',
        'Exclusive pro badges',
        'Early access to new features'
      ])
    }
  });
  
  console.log('Created product:', product.id);

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 999,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      type: 'monthly'
    }
  });
  
  console.log('Created monthly price:', monthlyPrice.id, '- $9.99/month');

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 7999,
    currency: 'usd',
    recurring: {
      interval: 'year',
    },
    metadata: {
      type: 'yearly'
    }
  });
  
  console.log('Created yearly price:', yearlyPrice.id, '- $79.99/year (save 33%)');
  
  console.log('\nVerde Pro subscription created successfully!');
  console.log('\nAdd these to your environment or config:');
  console.log(`VERDE_PRO_PRODUCT_ID=${product.id}`);
  console.log(`VERDE_PRO_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
  console.log(`VERDE_PRO_YEARLY_PRICE_ID=${yearlyPrice.id}`);
}

createVerdeProSubscription()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error creating Verde Pro:', err);
    process.exit(1);
  });

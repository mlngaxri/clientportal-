export function assertCheckoutEnabled(input: { package: string; kind: string }, env: Record<string, string | undefined>) {
  if (env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && env.ENABLE_LIVE_CUSTOMERS !== 'true') throw new Error('Live payments are not open yet.');
  if (input.package === 'FIRST' && env.ENABLE_FIRST_BILLING !== 'true') throw new Error('First applications are not open for payment yet.');
  if (input.kind === 'pro' && env.ENABLE_PRO_BILLING !== 'true') throw new Error('Pro billing is not open until the connected-site integrations are ready.');
}

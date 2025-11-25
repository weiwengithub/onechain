import Joi from 'joi';

export type ImportCustomERC20TokenForm = {
  address: string;
  symbol: string;
  decimals: string;
  logoUrl?: string;
};

export function useSchema() {
  const importCustomERC20TokenForm = Joi.object<ImportCustomERC20TokenForm>({
    address: Joi.string().required().messages({
      'string.empty': 'pages.manage-assets.import.assets.components.ERC20.index.required',
    }),
    symbol: Joi.string().required().messages({
      'string.empty': 'pages.manage-assets.import.assets.components.ERC20.index.required',
    }),
    decimals: Joi.string()
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.empty': 'pages.manage-assets.import.assets.components.ERC20.index.required',
        'string.pattern.base': 'pages.manage-assets.import.assets.components.ERC20.index.decimalsHelper',
      }),
    logoUrl: Joi.string().uri({ allowRelative: true }).allow('', null).messages({
      'string.uri': 'pages.manage-assets.import.assets.components.ERC20.index.logoUrlHelper',
    }),
  });

  return { importCustomERC20TokenForm };
}

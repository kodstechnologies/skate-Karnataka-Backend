export const create_event = {
  body: Joi.object({
    header: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
  }),
}


export {
    create_event
}
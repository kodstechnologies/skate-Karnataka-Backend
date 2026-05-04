import Joi from "joi";

export const afterLoginParentFormValidation = {

}

export const addContactUSValidation = {
  body: Joi.object({
    email: Joi.string()
      .trim()
      .email()
      .required()
      .messages({
        "string.empty": "Email is required",
        "string.email": "Invalid email format",
        "any.required": "Email is required"
      }),

    phone: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.empty": "Phone number is required",
        "string.pattern.base": "Invalid phone number",
        "any.required": "Phone number is required"
      })

  }),
};


export const addFeedBackValidation = {
  body: Joi.object({
    fullName: Joi.string().trim().min(3).max(50).required().messages({
      "string.empty": "Full name is required",
      "any.required": "Full name is required",
    }),
    email: Joi.string().trim().email().required().messages({
      "string.empty": "Email is required",
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),
    phone: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required().messages({
      "string.empty": "Phone number is required",
      "string.pattern.base": "Invalid phone number",
      "any.required": "Phone number is required",
    }),
    message: Joi.string().trim().min(5).max(1000).required().messages({
      "string.empty": "Message is required",
      "any.required": "Message is required",
    }),
  })
};

export const addNewsValidation = {
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).required().messages({
      "string.empty": "Heading is required",
      "any.required": "Heading is required",
    }),
    about: Joi.string().trim().min(5).max(2000).required().messages({
      "string.empty": "About is required",
      "any.required": "About is required",
    }),
  }),
};

export const updateNewsValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "News id is required",
      "string.empty": "News id is required",
    }),
  }),
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).optional(),
    about: Joi.string().trim().min(5).max(2000).optional(),
  }).min(1),
};

export const newsByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "News id is required",
      "string.empty": "News id is required",
    }),
  }),
};

export const displayNewsQueryValidation = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().trim().max(200).allow("").optional(),
  }),
};

export const eventByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Event id is required",
      "string.empty": "Event id is required",
    }),
  }),
};

export const addDisciplineValidation = {
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    title: Joi.string().trim().min(3).max(200).required().messages({
      "string.empty": "Title is required",
      "any.required": "Title is required",
    }),
    text: Joi.string().trim().allow("").optional(),
    about: Joi.string().trim().min(5).max(2000).required().messages({
      "string.empty": "About is required",
      "any.required": "About is required",
    }),
  }),
};

export const updateDisciplineValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Discipline id is required",
      "string.empty": "Discipline id is required",
    }),
  }),
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    title: Joi.string().trim().min(3).max(200).optional(),
    text: Joi.string().trim().allow("").optional(),
    about: Joi.string().trim().min(5).max(2000).optional(),
  }).min(1),
};

export const disciplineByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Discipline id is required",
      "string.empty": "Discipline id is required",
    }),
  }),
};

export const addCircularValidation = {
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).required().messages({
      "string.empty": "Heading is required",
      "any.required": "Heading is required",
    }),
    text: Joi.string().trim().min(3).max(2000).required().messages({
      "string.empty": "Text is required",
      "any.required": "Text is required",
    }),
    date: Joi.date().optional(),
  }),
};

export const updateCircularValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Circular id is required",
      "string.empty": "Circular id is required",
    }),
  }),
  body: Joi.object({
    img: Joi.string().uri().allow("").optional().messages({
      "string.uri": "Image must be a valid URL",
    }),
    heading: Joi.string().trim().min(3).max(200).optional(),
    text: Joi.string().trim().min(3).max(2000).optional(),
    date: Joi.date().optional(),
  }).min(1),
};

export const circularByIdValidation = {
  params: Joi.object({
    id: Joi.string().trim().required().messages({
      "any.required": "Circular id is required",
      "string.empty": "Circular id is required",
    }),
  }),
};

const aboutImgSchema = Joi.alternatives()
  .try(
    Joi.string().uri().allow("").messages({
      "string.uri": "Each image must be a valid URL",
    }),
    Joi.array().items(
      Joi.string().uri().allow("").messages({
        "string.uri": "Each image must be a valid URL",
      })
    )
  )
  .optional();

const aboutBodyFields = {
  logo: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Logo must be a valid URL",
  }),
  img: aboutImgSchema,
  heading: Joi.string().trim().min(1).max(500).optional(),
  about: Joi.string().trim().min(1).max(10000).optional(),
  ourMission: Joi.string().trim().min(1).max(10000).optional(),
  student: Joi.number().integer().min(0).optional(),
  titles: Joi.string().trim().max(500).allow("").optional(),
  address: Joi.string().trim().max(500).allow("").optional(),
  email: Joi.string().trim().email().allow("").optional(),
  phoneNo: Joi.string().trim().max(20).allow("").optional(),
};

export const addAboutValidation = {
  body: Joi.object({
    ...aboutBodyFields,
    heading: Joi.string().trim().min(1).max(500).required().messages({
      "string.empty": "Heading is required",
      "any.required": "Heading is required",
    }),
    about: Joi.string().trim().min(1).max(10000).required().messages({
      "string.empty": "About is required",
      "any.required": "About is required",
    }),
    ourMission: Joi.string().trim().min(1).max(10000).required().messages({
      "string.empty": "Our mission is required",
      "any.required": "Our mission is required",
    }),
  }),
};

export const updateAboutValidation = {
  body: Joi.object(aboutBodyFields).min(1),
};
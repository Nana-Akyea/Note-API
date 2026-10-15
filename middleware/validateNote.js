const Joi = require('joi');

const fields = {
    title: Joi.string().trim().min(1).max(200),
    content: Joi.string().trim().min(1),
    category: Joi.string().trim().max(50),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(20)
};

const createNoteSchema = Joi.object({
    ...fields,
    title: fields.title.required(),
    content: fields.content.required()
});

// PUT: any subset of fields, but at least one
const updateNoteSchema = Joi.object(fields).min(1);

const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body ?? {}, { abortEarly: false });
    if (error) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: error.details.map((detail) => detail.message)
        });
    }
    req.body = value;
    next();
};

module.exports = {
    validateCreateNote: validate(createNoteSchema),
    validateUpdateNote: validate(updateNoteSchema)
};

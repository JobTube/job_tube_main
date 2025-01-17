const { OpenAI } = require('openai');
require('dotenv').config();

const generateContentCV = async (description, title) => {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
        { role: "system", content: "You are a resume content generator." },
        { role: "user", content: `Based on the description below, generate values ​​within the json code for the professional resume in in the language in which the description is written. If there is no information, the values can be left blank, but skills and summary values have to been filled. However, in any case, the values ​​must be of string array type, except for the summary value. The summary value must be of type string. Then the headers ​​must be translated into the language in which the description is written. Description: '${description}'
            {
            values:
            {
                skills: [],
                summary: '',
                languages: [],
                educations: [],
                experience: [],
            },
            headers: {
                head_contact: 'Contact',
                head_phone: 'Phone',
                head_email: 'Email',
                head_address: 'Address',
                head_skills: 'Skills',
                head_language: 'Language skills'
                head_summary: 'Summary',
                head_languages: 'Languages',
                head_education: 'Education',
                head_experience: 'Experience',
                head_title: '${title}',
                head_question: 'Questions employers may ask',
            }
            }`,
        },
        ],
        max_tokens: 1000,
    });
    return response.choices[0].message.content;
}

module.exports = generateContentCV;
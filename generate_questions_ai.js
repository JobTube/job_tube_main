const { OpenAI } = require('openai');
require('dotenv').config();

const generateQuestions = async (header, job) => {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
        { role: "system", content: "You are a jobseeker assistant." },
        { role: "user", content: `Generate values ​values ​​inside the json code for the job seeker. List 5-10 questions a employer might ask a ${job} and their answers. in the language in which the header is written. Header: '${header}'
            {
                header: '${header}',
                questions_answers: []
            }`,
        },
        ],
        max_tokens: 1000,
    });
    return response.choices[0].message.content;
}

module.exports = generateQuestions;
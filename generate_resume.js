const PDFDocument = require('pdfkit');
const fs = require('fs');
const { OpenAI } = require('openai');

const generateClassicCV = (user, title, path, phone, email, address, data) => {
    const doc = new PDFDocument({ margin: 40 });
    doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
    doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));
  
    doc.font('Roboto').fontSize(24).text(user, { align: 'center' });
    doc.font('Roboto').fontSize(16).fillColor('#444444').text(title, { align: 'center' });
  
    doc.moveDown(1);
  
    doc.fontSize(14).fillColor('#000000').text(data.headers.head_contact, { underline: true });
    doc.fontSize(12).text(phone);
    doc.text(email);
    doc.text(address);
  
    doc.moveDown(1);
  
    doc.fontSize(14).fillColor('#000000').text(data.headers.head_skills, { underline: true });
    data.values.skills.forEach(skill => {
      doc.fontSize(12).text(`• ${skill}`);
    });
  
    doc.moveDown(1);
  
    doc.fontSize(14).fillColor('#000000').text(data.headers.head_summary, { underline: true });
    doc.fontSize(12).text(data.values.summary, { align: 'justify' });
  
    doc.moveDown(1);
  
    data.values.educations.length ? doc.fontSize(14).fillColor('#000000').text(data.headers.head_education, { underline: true }) : null;
    data.values.educations.forEach(education => {
      doc.fontSize(12).text(`• ${education}`, { width: 500, align: 'justify' });
      doc.moveDown(0.5);
    });

    data.values.experience.length ? doc.fontSize(14).fillColor('#000000').text(data.headers.head_experience, { underline: true }) : null;
    data.values.experience.forEach(job => {
      doc.fontSize(12).text(`• ${job}`, { width: 500, align: 'justify' });
      doc.moveDown(0.5);
    });
  
    doc.end();
};

const generateContentCV = async (description) => {

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
        { role: "system", content: "You are a resume content generator." },
        { role: "user", content: `Based on the description below, generate values adn headers ​​within the json code for the professional resume in in the language in which the description is written. The required value have to been filled. If there is no information, the optional values can be left blank. However, in any case, the value must remain in its string array or string type. Then the headers ​​must be translated into the language in which the description is written: '${description}'
            {
            values:
            {
                skills: ['required'],
                summary: 'required.',
                languages: ['optional'],
                educations: ['optional'],
                experience: ['optional'],
            },
            headers: {
                head_contact: 'Contact',
                head_skills: 'Skills',
                head_summary: 'Summary',
                head_languages: 'Languages',
                head_education: 'Education',
                head_experience: 'Experience',
            }
            }`,
        },
        ],
        max_tokens: 1000,
    });
    return response.choices[0].message.content;
}

const generateCV = (user, title, path, phone, email, address, description) => {
    generateContentCV(description).then(data=>{
        try{
          const json = JSON.parse(data);
          generateClassicCV(user, title, path, phone, email, address, json);
          return true;
        }catch (err) {
          return false;
        }
    });
}

module.exports = generateCV;

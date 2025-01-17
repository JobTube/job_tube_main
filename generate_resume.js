const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateClassicCV = (user, title, path, phone, email, address, data) => {
    const doc = new PDFDocument({ margin: 40 });
    doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
    doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));
    
  
    doc.font('Roboto').fontSize(24).text(user, { align: 'center' });
    title.length ? doc.font('Roboto').fontSize(16).fillColor('#444444').text(data.headers.head_title, { align: 'center' }) : null;

    fs.existsSync(`/data-files/${path}/profile.png`) ? doc.image(`/data-files/${path}/profile.png`, 50, 25, { width: 100, height: 100 }) : null;
  
    doc.moveDown(3);
  
    doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_contact, { underline: true });
    doc.font('Roboto').fontSize(12).text(`${data.headers.head_phone}: +${phone}`);
    email.length ? doc.text(`${data.headers.head_email}: ${email}`) : null;
    address.length ? doc.text(`${data.headers.head_address}: ${address}`) : null;
  
    doc.moveDown(1);
  
    doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_skills, { underline: true });
    data.values.skills.forEach(skill => {
      doc.font('Roboto').fontSize(12).text(`• ${skill}`);
    });
  
    doc.moveDown(1);
  
    doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_summary, { underline: true });
    doc.font('Roboto').fontSize(12).text(data.values.summary, { align: 'justify' });
  
    doc.moveDown(1);

    data.values.languages.length ? doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_language, { underline: true }) : null;
    data.values.languages.forEach(language => {
      doc.font('Roboto').fontSize(12).text(`• ${language}`, { width: 500, align: 'justify' });
      doc.moveDown(0.5);
    });

    doc.moveDown(1);
  
    data.values.educations.length ? doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_education, { underline: true }) : null;
    data.values.educations.forEach(education => {
      doc.font('Roboto').fontSize(12).text(`• ${education}`, { width: 500, align: 'justify' });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(1);

    data.values.experience.length ? doc.font('Roboto').fontSize(14).fillColor('#000000').text(data.headers.head_experience, { underline: true }) : null;
    data.values.experience.forEach(job => {
      doc.font('Roboto').fontSize(12).text(`• ${job}`, { width: 500, align: 'justify' });
      doc.moveDown(0.5);
    });
  
    doc.end();
};

const generateElegantCV = (user, title, path, phone, email, address, data) => {
  const doc = new PDFDocument({ margin: 40 });
  doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
  doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));

  doc.font('Roboto').fontSize(28).fillColor('#333333').text(user, { align: 'center' });
  title.length ? doc.font('Roboto').fontSize(16).fillColor('#777777').text(data.headers.head_title, { align: 'center' }) : null;

  fs.existsSync(`/data-files/${path}/profile.png`) ? doc.image(`/data-files/${path}/profile.png`, 50, 25, { width: 100, height: 100 }) : null;

  doc.moveDown(3);

  doc.font('Roboto').fontSize(14).fillColor('#333333').text('Contact');
  doc.font('Roboto').fontSize(12).text(`${data.headers.head_phone}: +${phone}`);
  email.length ? doc.text(`${data.headers.head_email}: ${email}`) : null;
  address.length ? doc.text(`${data.headers.head_address}: ${address}`) : null;

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#333333').text(data.headers.head_skills);
  data.values.skills.forEach(skill => {
    doc.font('Roboto').fontSize(12).text(`• ${skill}`);
  });

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#333333').text(data.headers.head_summary);
  doc.font('Roboto').fontSize(12).text(data.summary, { align: 'justify' });

  doc.moveDown(1);

  data.values.languages.length ? doc.font('Roboto').fontSize(14).fillColor('#333333').text(data.headers.head_language) : null;
  data.values.languages.forEach(language => {
    doc.font('Roboto').fontSize(12).text(`• ${language}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.educations.length ? doc.font('Roboto').fontSize(14).fillColor('#333333').text(data.headers.head_education) : null;
  data.values.educations.forEach(education => {
    doc.font('Roboto').fontSize(12).text(`• ${education}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.experience.length ? doc.font('Roboto').fontSize(14).fillColor('#333333').text(data.headers.head_experience) : null;
  data.values.experience.forEach(job => {
    doc.font('Roboto').fontSize(12).text(`• ${job}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.end();
};

const generateModernCV = (user, title, path, phone, email, address, data) => {
  const doc = new PDFDocument({ margin: 40 });
  doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
  doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));

  doc.rect(0, 0, 612, 130).fill('#007ACC');
  doc.font('Roboto').fontSize(24).fillColor('#FFFFFF').text(user, 50, 50);
  title.length ? doc.font('Roboto').fontSize(16).fillColor('#FFFFFF').text(data.headers.head_title, 50, 75): null;

  fs.existsSync(`/data-files/${path}/profile.png`) ? doc.image(`/data-files/${path}/profile.png`, 500, 15, { width: 100, height: 100 }) : null;

  doc.moveDown(3);

  doc.font('Roboto').fontSize(14).fillColor('#007ACC').text('Contact');
  doc.fillColor('#000000').fontSize(12).text(`${data.headers.head_phone}: +${phone}`);
  email.length ? doc.text(`${data.headers.head_email}:: ${email}`) : null;
  address.length ? doc.text(`${data.headers.head_address}:: ${address}`) : null;

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#007ACC').text(data.headers.head_skills);
  data.values.skills.forEach(skill => {
    doc.font('Roboto').fontSize(12).text(`• ${skill}`);
  });

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#007ACC').text(data.headers.head_summary);
  doc.font('Roboto').fontSize(12).fillColor('#000000').text(data.values.summary, { align: 'justify' });

  doc.moveDown(1);

  data.values.languages.length ? doc.font('Roboto').fontSize(14).fillColor('#007ACC').text(data.headers.head_language) : null;
  data.values.languages.forEach(language => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${language}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.educations.length ? doc.font('Roboto').fontSize(14).fillColor('#007ACC').text(data.headers.head_education) : null;
  data.values.educations.forEach(education => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${education}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.experience.length ? doc.font('Roboto').fontSize(14).fillColor('#007ACC').text(data.headers.head_experience) : null;
  data.values.experience.forEach(job => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${job}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.end();
};

const generateCreativeCV = (user, title, path, phone, email, address, data) => {
  const doc = new PDFDocument({ margin: 40 });
  doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
  doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));

  doc.rect(0, 0, 612, 130).fill('#FF5722');
  doc.font('Roboto').fontSize(28).fillColor('#FFFFFF').text(user, 50, 30);
  title.length ? doc.font('Roboto').fontSize(16).fillColor('#FFFFFF').text(data.headers.head_title, 50, 70) : null;

  fs.existsSync(`/data-files/${path}/profile.png`) ? doc.image(`/data-files/${path}/profile.png`, 500, 15, { width: 100, height: 100 }) : null;

  doc.moveDown(3);

  doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_contact);
  doc.font('Roboto').fontSize(12).fillColor('#000000').text(`${data.headers.head_phone}: +${phone}`);
  email.length ? doc.text(`${data.headers.head_email}: ${email}`) : null;
  address.length ? doc.text(`${data.headers.head_address}: ${address}`) : null;

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_skills);
  data.values.skills.forEach(skill => {
    doc.font('Roboto').fontSize(12).text(`• ${skill}`);
  });

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_summary);
  doc.font('Roboto').fontSize(12).fillColor('#000000').text(data.values.summary, { align: 'justify' });

  doc.moveDown(1);

  data.values.languages.length ? doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_language) : null;
  data.values.languages.forEach(language => {
    doc.font('Roboto').fontSize(12).text(`• ${language}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.educations.length ? doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_education) : null;
  data.values.educations.forEach(education => {
    doc.font('Roboto').fontSize(12).text(`• ${education}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.experience.length ? doc.font('Roboto').fontSize(14).fillColor('#FF5722').text(data.headers.head_experience) : null;
  data.values.experience.forEach(job => {
    doc.font('Roboto').fontSize(12).text(`• ${job}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.end();
};

const generateColorfulCV = (user, title, path, phone, email, address, data) => {
  const doc = new PDFDocument({ margin: 40 });
  doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
  doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));

  doc.rect(0, 0, 612, 130).fill('#4CAF50');
  doc.font('Roboto').fontSize(28).fillColor('#FFFFFF').text(user, 50, 30);
  title.length ? doc.font('Roboto').fontSize(16).fillColor('#FFFFFF').text(data.headers.head_title, 50, 70) : null;

  fs.existsSync(`/data-files/${path}/profile.png`) ? doc.image(`/data-files/${path}/profile.png`, 500, 15, { width: 100, height: 100 }) : null;

  doc.moveDown(4);

  doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_contact);
  doc.font('Roboto').fontSize(12).fillColor('#000000').text(`${data.headers.head_phone}: +${phone}`);
  email.length ? doc.text(`${data.headers.head_email}: ${email}`) : null;
  address.length ? doc.text(`${data.headers.head_address}: ${email}`) : null;

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_skills);
  data.values.skills.forEach(skill => {
    doc.font('Roboto').fontSize(12).text(`• ${skill}`);
  });

  doc.moveDown(1);

  doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_summary);
  doc.font('Roboto').fontSize(12).fillColor('#000000').text(data.values.summary, { align: 'justify' });

  doc.moveDown(1);

  data.values.languages.length ? doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_language) : null;
  data.values.languages.forEach(language => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${language}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.educations.length ? doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_education) : null;
  data.values.educations.forEach(education => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${education}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);

  data.values.experience.length ? doc.font('Roboto').fontSize(14).fillColor('#4CAF50').text(data.headers.head_experience) : null;
  data.values.experience.forEach(job => {
    doc.font('Roboto').fontSize(12).fillColor('#000000').text(`• ${job}`, { width: 500, align: 'justify' });
    doc.moveDown(0.5);
  });

  doc.end();
};

module.exports = [generateClassicCV, generateElegantCV, generateModernCV, generateCreativeCV, generateColorfulCV];

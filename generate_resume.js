const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateClassicCV = (user, title, path, phone, email, address, data) => {
    const doc = new PDFDocument({ margin: 40 });
    doc.registerFont('Roboto', 'files/Roboto-Regular.ttf');
    doc.pipe(fs.createWriteStream(`/data-files/${path}/resume.pdf`));
    // doc.pipe(fs.createWriteStream(`files/resume.pdf`));
  
    doc.font('Roboto').fontSize(24).text(user, { align: 'center' });
    doc.font('Roboto').fontSize(16).fillColor('#444444').text(title, { align: 'center' });
  
    doc.moveDown(1);
  
    doc.fontSize(14).fillColor('#000000').text(data.headers.head_contact, { underline: true });
    doc.fontSize(12).text(`${data.headers.head_phone}: ${phone}`);
    email.length ? doc.text(`${data.headers.head_email}: ${email}`) : null;
    address.length ? doc.text(`${data.headers.head_address}: ${address}`) : null;
  
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

module.exports = generateClassicCV;

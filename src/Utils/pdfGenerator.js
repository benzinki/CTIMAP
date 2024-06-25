// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (newsArticle) => {
  const doc = new jsPDF();

  // Add title with word wrapping
  doc.setFontSize(20);
  const splitTitle = doc.splitTextToSize(newsArticle.title, 180);
  let currentY = 20;
  splitTitle.forEach((line, index) => {
    doc.text(line, 10, currentY + (index * 10));
  });

  // Adjust currentY based on title height
  currentY += splitTitle.length * 10;

  // Add metadata table
  doc.autoTable({
    startY: currentY + 10,
    body: [
      ['Country', newsArticle.country],
      ['Threat Actor', newsArticle.threatActor],
      ['Case Date', new Date(newsArticle.caseDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })],
    ],
    theme: 'grid',
    headStyles: { fillColor: [22, 160, 133] },
    styles: { fontSize: 12 },
  });

  // Add space after the table
  currentY = doc.autoTable.previous.finalY + 20;

  // Add description with word wrapping
  doc.setFontSize(12);
  const splitDescription = doc.splitTextToSize(newsArticle.description, 180);
  splitDescription.forEach((line, index) => {
    doc.text(line, 10, currentY + (index * 10));
  });

  // Add IOC and MITRE Attack information close to the description
  currentY += splitDescription.length * 10 + 10;
  doc.text('IOC:', 10, currentY);
  const splitIOC = doc.splitTextToSize(newsArticle.ioc, 180);
  splitIOC.forEach((line, index) => {
    doc.text(line, 10, currentY + 10 + (index * 10));
  });

  currentY += splitIOC.length * 10 + 20;
  doc.text('MITRE Attack:', 10, currentY);
  const splitMITRE = doc.splitTextToSize(newsArticle.mitreAttack, 180);
  splitMITRE.forEach((line, index) => {
    doc.text(line, 10, currentY + 10 + (index * 10));
  });

  // Save the PDF
  doc.save(`${newsArticle.title}.pdf`);
};
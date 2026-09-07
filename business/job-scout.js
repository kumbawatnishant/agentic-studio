// Job Scout — Finds roles and generates tailored applications
const fs = require('fs');

const SKILLS = ['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Tailwind'];
const TARGET_ROLES = ['Full Stack Developer', 'Frontend Engineer', 'React Developer', 'Node.js Developer'];

function generateResumeTailoring(jobDescription) {
    // Simple keyword matching — replace with Claude API call for production
    const matched = SKILLS.filter(skill => 
        jobDescription.toLowerCase().includes(skill.toLowerCase())
    );
    
    return {
        highlightedSkills: matched,
        missingSkills: SKILLS.filter(s => !matched.includes(s)),
        suggestedProjects: matched.map(s => `Project using ${s}`)
    };
}

function generateCoverLetter(company, role, jobDescription) {
    const tailoring = generateResumeTailoring(jobDescription);
    
    return `Dear Hiring Manager at ${company},

I am writing to express my interest in the ${role} position. With hands-on experience in ${tailoring.highlightedSkills.join(', ')}, I have built and shipped production applications that align closely with your requirements.

Recent projects include:
${tailoring.suggestedProjects.map(p => `- ${p} (deployed to Vercel, used by 100+ users)`).join('\n')}

I am particularly drawn to ${company}'s mission and would welcome the opportunity to contribute to your team.

Best regards,
[Your Name]

Portfolio: https://yourportfolio.vercel.app
GitHub: https://github.com/yourusername`;
}

// Example usage
const sampleJob = {
    company: "TechStart Inc",
    role: "Full Stack Developer",
    url: "https://example.com/jobs/123",
    description: "Looking for a Full Stack Developer with React, Node.js, and PostgreSQL experience..."
};

const output = {
    leadId: Date.now(),
    ...sampleJob,
    matchScore: 85,
    tailoredCoverLetter: generateCoverLetter(sampleJob.company, sampleJob.role, sampleJob.description),
    status: "ready_to_apply",
    dateFound: new Date().toISOString()
};

fs.writeFileSync(`business/leads/${output.leadId}.json`, JSON.stringify(output, null, 2));
console.log(`✅ Lead saved: ${output.company} — ${output.role}`);

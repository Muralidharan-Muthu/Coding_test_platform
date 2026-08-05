import os

files = [
    r'frontend\src\pages\SendMailPage.jsx',
    r'frontend\src\pages\QuestionsPage.jsx',
    r'frontend\src\pages\MCQQuestionsPage.jsx',
    r'frontend\src\pages\LandingPage.jsx',
    r'frontend\src\pages\HRDashboard.jsx',
    r'frontend\src\pages\ChooseTestTypePage.jsx',
    r'frontend\src\pages\CandidateOTP.jsx',
    r'frontend\src\pages\AssessmentDashboard.jsx',
]

base = r'c:\Users\mural\Desktop\HackerRank\HackerRank-Like-Coding-Test-Platform'
for f in files:
    path = os.path.join(base, f)
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        new_content = content.replace("'HR User'", "'Admin User'")
        if new_content != content:
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_content)
            print(f'Updated: {f}')
        else:
            print(f'No change: {f}')
    except Exception as e:
        print(f'Error {f}: {e}')
print('Done.')

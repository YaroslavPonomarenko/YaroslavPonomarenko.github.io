import datetime

html_file_path = 'index.html'
now = datetime.datetime.now()
formatted_date = now.strftime('%A, %B %-d, %Y, at %I:%M:%S %p')

with open(html_file_path, 'r+') as file:
    html_content = file.read()
    updated_stamp = f'<!--LAST_UPDATE_START-->\n                          Last updated on {formatted_date}.\n                          '

    html_content = html_content.replace(
        html_content[html_content.find('<!--LAST_UPDATE_START-->'):html_content.find('<!--LAST_UPDATE_END-->')],
        updated_stamp)

    file.seek(0)
    file.write(html_content)
    file.truncate()

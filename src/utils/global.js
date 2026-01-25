export function sanitizeName(name) {
    return name.toLowerCase().replace(/\s+/g, '_');
}

export function doAll() {
    let dropdowns = document.querySelectorAll('.navbar .dropdown-toggler');
    let dropdownIsOpen = false;

    if (dropdowns.length) {
        dropdowns.forEach((dropdown) => {
            dropdown.addEventListener('click', (event) => {
                let target = document.querySelector(`#${event.target.dataset.dropdown}`);
                if (target) {
                    if (target.classList.contains('show')) {
                        target.classList.remove('show');
                        dropdownIsOpen = false;
                    } else {
                        target.classList.add('show');
                        dropdownIsOpen = true;
                    }
                }
            });
        });
    }

    window.addEventListener('mouseup', (event) => {
        if (dropdownIsOpen) {
            dropdowns.forEach((dropdownButton) => {
                let dropdown = document.querySelector(`#${dropdownButton.dataset.dropdown}`);
                let targetIsDropdown = dropdown == event.target;
                if (dropdownButton == event.target) {
                    return;
                }
                if ((!targetIsDropdown) && (!dropdown.contains(event.target))) {
                    dropdown.classList.remove('show');
                }
            });
        }
    });

    document.addEventListener('keydown', function (event) {
        const searchInput = document.getElementById('searchInput');

        if ((event.key === 'l' || event.key === 'L') && document.activeElement !== searchInput) {
            event.preventDefault();
            if (searchInput) {
                searchInput.focus();
            }
        }
    });

}
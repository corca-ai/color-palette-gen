# Third-party development dependencies

The deployed static application does not bundle the packages listed here. They
are installed in development and CI to verify the project's independent
runtime implementation.

## apca-w3 0.1.9

- Source: <https://github.com/Myndex/apca-w3>
- Package: <https://www.npmjs.com/package/apca-w3/v/0.1.9>
- Declared license: Limited W3 License
- Use in this project: reference calculations in automated tests for web-content
  text contrast. The package is not modified or shipped to browsers.

The upstream license limits use and the use of APCA terminology. Consult the
[upstream license](https://github.com/Myndex/apca-w3/blob/master/LICENSE.md)
before changing the use case, redistributing its code, or presenting this
prototype as an official APCA-qualified tool.

## colorparsley 0.1.8

- Source: <https://github.com/Myndex/colorparsley>
- Package: <https://www.npmjs.com/package/colorparsley/v/0.1.8>
- Declared license: AGPL-3.0
- Use in this project: transitive development dependency of `apca-w3`; it is
  not imported by application code or shipped to browsers.


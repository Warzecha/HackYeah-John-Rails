const {
    dialogflow,
    BrowseCarousel,
    Carousel,
    OptionItem,
    BrowseCarouselItem,
    Suggestions,
    BasicCard,
    Table,
    Button,
    Image
} = require('actions-on-google')
const functions = require('firebase-functions')
const app = dialogflow({ debug: true })
const axios = require('axios');

const baseUrl = 'https://pkp-assistant.herokuapp.com'


app.intent('connectionFromTo', (conv, parameters) => {

    console.log(parameters)
    conv.data.origin = parameters['geo-city']
    conv.data.destination = parameters['geo-city1']
    conv.data.date = parameters.date




    conv.ask('Here are the connections you should be interested in')




    // TODO: dodac rozpoznawanie okresu czasu
    const body = {}

    return axios.get([baseUrl, '/journeys'].join(''))
        .then((res) => {
            let items = []

            let voiceResponse = 'The places nearby are '

            let prefix = ''

            let places_titles = []

            res.data.forEach((el) => {


                let url = 'https://i.imgur.com/fkcwtvS.png'

                if (el.trainId[0] == 'T') {
                    url = 'https://i.imgur.com/Wex0wSK.png'
                }


// TODO: calculate it correctly
                let depArr = el.dep.split(':')
                let arrArr = el.arr.split(':')

                let duration = (arrArr[0] - depArr[0]) + ':' + (arrArr[1] - depArr[1])



                items.push(new BrowseCarouselItem({
                    title: [parameters['geo-city'], ' - ', parameters['geo-city1'], ' | ', el.trainId].join(''),
                    url: 'https://rozklad-pkp.pl/',
                    description: ['Departure: ', el.dep, ', Arrival: ', el.arr, '\nDuration: ', duration, ' | Price: ', el.price, ' PLN'].join(''),
                    image: new Image({
                        url: url,
                        alt: 'Image'
                    })
                })
                )
                places_titles.push(el.title)

                voiceResponse += prefix + el.title
                prefix = ', '

            })


            conv.ask(new BrowseCarousel({
                items: items
            }))


            conv.ask('Describe tickets you want to book')

        })
        .catch((err) => {

            console.log(err.message)
            conv.close('Sorry, could not get your photo')
        })





});


app.intent('connectionFromTo.tickets', (conv, parameters) => {


    console.log(parameters)

    let hour = parseInt(parameters.time.split(':')[0], 10)

    const body = {
        hour: hour,
        seats: parameters.number,
        ticketType: parameters.ticketType
    }

    conv.data.last = body

    return axios.post(baseUrl + '/bookticket', body)
    .then((res) => {


        conv.data.last.trainNumber = res.data.journey.trainId
        conv.data.last.dep = res.data.journey.dep
        conv.data.last.arr = res.data.journey.arr

        let items = []


        res.data.seatNumbers.forEach((el) => {
            items.push(
                {
                    cells: [res.data.cartNumber.toString(), el.toString(), res.data.ticketType, res.data.journey.price.toString()],
                    dividerAfter: false,
                }
            )
        })

        items[items.length - 1].dividerAfter = true,

        items.push(
            {
                cells: ['-', '-', 'Total:', (res.data.journey.price * res.data.seatNumbers.length).toString()],

            }
        )

        console.log(items)
    conv.ask('Your order summary')
    conv.ask(new Table({
        title: conv.data.origin + ' - ' + conv.data.destination,
        subtitle: conv.data.date + ' | ' + res.data.journey.dep + ' - ' + res.data.journey.arr + '\n' + res.data.journey.trainId,
        image: new Image({
            url: 'https://i.imgur.com/fkcwtvS.png',
            alt: 'PKP'
        }),
        columns: [

            {
                header: 'Cart number',
                align: 'LEADING',
            },
            {
                header: 'Seat number',
                align: 'LEADING',
            },
            {
                header: 'Ticket type',
                align: 'LEADING',
            },
            {
                header: 'Price',
                align: 'LEADING',
            },
        ],
        rows: items
        
    }))

    conv.ask('Would you like to finalize your order?')


    })

    .catch((err) => {
        console.log(err.message)
        conv.close('Could not book your train.')
    })












})



app.intent('connectionFromTo.tickets.finalize', (conv) => {



    return axios.post([baseUrl, '/finalize'].join(''), conv.data.last )

    .then((res) => {

        console.log(res)
        conv.user.storage.last = conv.data.last
        conv.user.storage.last.origin = conv.data.origin
        conv.user.storage.last.destination = conv.data.destination
        conv.user.storage.last.date = conv.data.date
        conv.user.storage.last.dep = conv.data.last.dep
        conv.user.storage.last.arr = conv.data.last.arr
        conv.close('Your order was finalized')

    })
    .catch((err) => {
        console.log(err.message)
        conv.close('Could not book your train.')
    })
    // conv.ask('All there is left is to pay')

    console.log(conv.data.last)



})


app.intent('checkTickets', (conv) => {
    console.log(conv.user.storage.last)
    conv.close('Here are your tickets')


    conv.ask(new BasicCard({
        text: `${conv.user.storage.last.trainNumber} | seats: ${conv.user.storage.last.seats}`, // Note the two spaces before '\n' required for
                                     // a line break to be rendered in the card.
        subtitle: `${conv.user.storage.last.date} | ${conv.user.storage.last.dep} - ${conv.user.storage.last.arr}`,
        title: `${conv.user.storage.last.origin} - ${conv.user.storage.last.destination}`,
        image: new Image({
          url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Example',
          alt: 'QR code',
        }),
        display: 'CROPPED',
      }));



})



exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)